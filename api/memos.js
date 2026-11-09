
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

let cachedVerifier;
let cachedSecretKey;

function getLoginVerifier(secretKey) {
  if (!cachedVerifier || cachedSecretKey !== secretKey) {
    cachedVerifier = createLoginVerifier({
      config,
      supabaseSecretKey: secretKey,
    });
    cachedSecretKey = secretKey;
  }

  return cachedVerifier;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  // 메모 조회는 GET 요청만 허용합니다.
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return response.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
    });
  }

  try {
    const baseUrl = new URL(supabaseUrl);
    const identityUrl = new URL(config.identityProvider.issuer);

    if (
      baseUrl.protocol !== 'https:' ||
      baseUrl.origin !== identityUrl.origin
    ) {
      return response.status(500).json({
        error: 'SERVER_CONFIGURATION_ERROR',
      });
    }

    // 브라우저가 보낸 로그인 증명서를 서버에서 직접 검사합니다.
    const verifyLoginAuthorization = getLoginVerifier(secretKey);
    const verifiedUser = await verifyLoginAuthorization(
      request.headers.authorization
    );

    // 정상적으로 인증된 학생 계정이 아니면 거부합니다.
    if (!verifiedUser || verifiedUser.kind !== 'student') {
      return response.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
      });
    }

    // 로그인 확인이 끝난 뒤에만 메모를 조회합니다.
    const endpoint = new URL('/rest/v1/learning_memos', baseUrl);

    endpoint.search = new URLSearchParams({
      select: 'title,content,created_at',
      order: 'created_at.asc',
    }).toString();

    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!upstream.ok) {
      const errorBody = await upstream.json().catch(() => ({}));

      console.error('Supabase memo request failed:', {
        status: upstream.status,
        code: errorBody.code || 'UNKNOWN',
        message: errorBody.message || 'No error message',
      });

      return response.status(502).json({
        error: 'MEMO_SERVICE_UNAVAILABLE',
      });
    }

    const rows = await upstream.json();

    if (!Array.isArray(rows)) {
      return response.status(502).json({
        error: 'INVALID_MEMO_RESPONSE',
      });
    }

    const notes = rows.map((row) => ({
      title: row.title,
      content: row.content,
      created_at: row.created_at,
    }));

    return response.status(200).json({ notes });
  } catch (error) {
    console.error('Memo service error:', {
      name: error?.name || 'UnknownError',
    });

    return response.status(502).json({
      error: 'MEMO_SERVICE_UNAVAILABLE',
    });
  }
}
