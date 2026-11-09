
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';

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

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidText(value, maxLength = 2000) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT, DELETE');
    return sendError(response, 405, 'METHOD_NOT_ALLOWED');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return sendError(response, 500, 'SERVER_CONFIGURATION_ERROR');
  }

  try {
    const baseUrl = new URL(supabaseUrl);
    const identityUrl = new URL(config.identityProvider.issuer);

    if (
      baseUrl.protocol !== 'https:'
      || baseUrl.origin !== identityUrl.origin
    ) {
      return sendError(response, 500, 'SERVER_CONFIGURATION_ERROR');
    }

    const verifyLoginAuthorization = getLoginVerifier(secretKey);
    const verifiedUser = await verifyLoginAuthorization(
      request.headers.authorization,
    );

    if (!verifiedUser || verifiedUser.kind !== 'student') {
      return sendError(response, 401, 'AUTHENTICATION_REQUIRED');
    }

    const memoId = request.query?.id;

    if (!isUuid(memoId)) {
      return sendError(response, 400, 'INVALID_MEMO_ID');
    }

    const endpoint = new URL('/rest/v1/learning_memos', baseUrl);
    endpoint.search = new URLSearchParams({
      select: 'id,title,content,created_at',
      id: `eq.${memoId}`,
    }).toString();

    const headers = {
      apikey: secretKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (request.method === 'GET') {
      const upstream = await fetch(endpoint, {
        method: 'GET',
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });

      if (!upstream.ok) {
        return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
      }

      const rows = await upstream.json();

      if (!Array.isArray(rows)) {
        return sendError(response, 502, 'INVALID_MEMO_RESPONSE');
      }

      if (rows.length === 0) {
        return sendError(response, 404, 'MEMO_NOT_FOUND');
      }

      const row = rows[0];

      return response.status(200).json({
        id: row.id,
        title: row.title,
        body: row.content,
      });
    }

    if (request.method === 'PUT') {
      const { title, body } = request.body || {};

      if (!isValidText(title, 200) || !isValidText(body)) {
        return sendError(response, 400, 'INVALID_MEMO');
      }

      const upstream = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          ...headers,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: body.trim(),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!upstream.ok) {
        return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
      }

      const rows = await upstream.json();

      if (!Array.isArray(rows)) {
        return sendError(response, 502, 'INVALID_MEMO_RESPONSE');
      }

      if (rows.length === 0) {
        return sendError(response, 404, 'MEMO_NOT_FOUND');
      }

      return response.status(200).json({ id: memoId });
    }

    const upstream = await fetch(endpoint, {
  method: 'DELETE',
  headers: {
    ...headers,
    Prefer: 'return=representation',
  },
  signal: AbortSignal.timeout(10000),
});

    if (!upstream.ok) {
      return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
    }

    const deletedRows = await upstream.json();

    if (!Array.isArray(deletedRows)) {
      return sendError(response, 502, 'INVALID_MEMO_RESPONSE');
    }

    if (deletedRows.length === 0) {
      return sendError(response, 404, 'MEMO_NOT_FOUND');
    }

    return response.status(200).json({ id: memoId });
  } catch (error) {
    console.error('Memo item service error:', {
      name: error?.name || 'UnknownError',
    });

    return sendError(response, 502, 'MEMO_SERVICE_UNAVAILABLE');
  }
}
