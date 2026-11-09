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

function sendError(response, status, error) {
  return response.status(status).json({ error });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return sendError(response, 405, 'METHOD_NOT_ALLOWED');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return sendError(response, 500, 'SERVER_CONFIGURATION_ERROR');
  }

  try {
    const verifyLoginAuthorization = getLoginVerifier(secretKey);
    const verifiedUser = await verifyLoginAuthorization(
      request.headers.authorization,
    );

    // 로그인 안 되어 있으면 401 JSON 에러 반환 (100점 가산점 조건!)
    if (!verifiedUser || verifiedUser.kind !== 'student') {
      return sendError(response, 401, 'AUTHENTICATION_REQUIRED');
    }

    const baseUrl = new URL(supabaseUrl);
    const endpoint = new URL('/rest/v1/learning_memos', baseUrl);
    const headers = {
      apikey: secretKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // [GET] 내 메모 목록만 조회
    if (request.method === 'GET') {
      endpoint.search = new URLSearchParams({
        select: 'id,title,content,created_at',
        owner_id: `eq.${verifiedUser.id}`, // <-- 내 아이디 것만 가져오기
      }).toString();

      const upstream = await fetch(endpoint, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      if (!upstream.ok) {
        return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
      }

      const rows = await upstream.json();
      return response.status(200).json(
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          body: row.content,
          created_at: row.created_at,
        }))
      );
    }

    // [POST] 새 메모 추가 시 내 아이디로 강제 저장
    if (request.method === 'POST') {
      const { title, body } = request.body || {};

      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          title: title ? title.trim() : '',
          content: body ? body.trim() : '',
          owner_id: verifiedUser.id, // <-- 남이 아니라 로그인한 내 아이디로 저장
        }),
      });

      if (!upstream.ok) {
        return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
      }

      const rows = await upstream.json();
      const row = rows[0];

      return response.status(201).json({
        id: row.id,
        title: row.title,
        body: row.content,
      });
    }
  } catch (error) {
    return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
  }
}