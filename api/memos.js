export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });
  }

  try {
    const baseUrl = new URL(supabaseUrl);

    if (baseUrl.protocol !== 'https:') {
      return response.status(500).json({ error: 'SERVER_CONFIGURATION_ERROR' });
    }

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

  return response.status(502).json({ error: 'MEMO_SERVICE_UNAVAILABLE' });
}

    const rows = await upstream.json();

    if (!Array.isArray(rows)) {
      return response.status(502).json({ error: 'INVALID_MEMO_RESPONSE' });
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

    return response.status(502).json({ error: 'MEMO_SERVICE_UNAVAILABLE' });
  }
}
