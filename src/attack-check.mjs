
async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
}

function validateAppUrl(config) {
  let app;

  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json에 실제 배포 주소를 입력해 주세요.');
  }

  if (
    app.protocol !== 'https:'
    || app.username
    || app.password
    || app.search
    || app.hash
    || app.pathname !== '/'
    || app.hostname.endsWith('.example')
  ) {
    throw new Error('aleph.config.json에 실제 배포 주소를 입력해 주세요.');
  }

  return app;
}

export async function runAttackChecks(config) {
  if (![1, 2, 3].includes(config.step)) {
    throw new Error('현재 단계의 공격 점검을 구현해 주세요.');
  }

  const app = validateAppUrl(config);

  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) {
    throw new Error('가상 메모의 확인 표시를 설정해 주세요.');
  }

  if (config.step === 1) {
    const response = await fetchWithTimeout(new URL('/data.json', app));
    let visible = false;

    if (response.ok) {
      try {
        const data = await response.json();
        visible = data?.sampleMarker === config.sampleMarker
          && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {
        // JSON이 아니면 공개 메모 확인 실패로 처리합니다.
      }
    }

    return [{
      attackId: 'anonymous_note_read',
      expected: '비로그인 화면에서 가상 메모를 확인',
      observed: visible
        ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임'
        : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})`,
    }];
  }

  if (config.step === 3) {
    const memoId = 'a1111111-1111-4111-8111-111111111111';
    const requests = [
      {
        attackId: 'anonymous_memo_list',
        method: 'GET',
        url: '/api/memos',
      },
      {
        attackId: 'anonymous_memo_create',
        method: 'POST',
        url: '/api/memos',
        body: {
          title: '비로그인 공격 점검용',
          body: '저장되면 안 되는 가상 자료',
        },
      },
      {
        attackId: 'anonymous_memo_read',
        method: 'GET',
        url: `/api/memos/${memoId}`,
      },
      {
        attackId: 'anonymous_memo_update',
        method: 'PUT',
        url: `/api/memos/${memoId}`,
        body: {
          title: '변경 시도',
          body: '수정되면 안 되는 가상 자료',
        },
      },
      {
        attackId: 'anonymous_memo_delete',
        method: 'DELETE',
        url: `/api/memos/${memoId}`,
      },
    ];

    const results = [];

    for (const item of requests) {
      let status = 0;

      try {
        const response = await fetchWithTimeout(
          new URL(item.url, app),
          {
            method: item.method,
            headers: item.body
              ? { 'Content-Type': 'application/json' }
              : {},
            ...(item.body ? { body: JSON.stringify(item.body) } : {}),
          },
        );

        status = response.status;
      } catch {
        status = 0;
      }

      const blocked = status === 401 || status === 403;

      results.push({
        attackId: item.attackId,
        expected: '비로그인 요청은 HTTP 401 또는 403으로 거부',
        observed: blocked
          ? `인증되지 않은 요청이 차단됨 (HTTP ${status})`
          : `요청이 차단되지 않았거나 응답을 확인할 수 없음 (HTTP ${status || '요청 실패'})`,
      });

      if (!blocked) {
        throw new Error(
          `${item.attackId} 공격 점검 실패: HTTP ${status || '요청 실패'}`,
        );
      }
    }

    return results;
  }

  let staticMemoExposed = false;
  let staticStatus = 0;

  try {
    const staticResponse = await fetchWithTimeout(new URL('/data.json', app));
    staticStatus = staticResponse.status;

    if (staticResponse.ok) {
      try {
        const data = await staticResponse.json();
        staticMemoExposed = Array.isArray(data?.notes)
          && data.notes.length > 0;
      } catch {
        // JSON이 아니면 메모 데이터 파일로 간주하지 않습니다.
      }
    }
  } catch {
    // 요청 실패는 메모 노출로 판정하지 않습니다.
  }

  let apiAvailable = false;
  let apiCount = 0;
  let apiStatus = 0;

  try {
    const apiResponse = await fetchWithTimeout(new URL('/api/memos', app));
    apiStatus = apiResponse.status;

    if (apiResponse.ok) {
      const data = await apiResponse.json();

      if (Array.isArray(data?.notes)) {
        apiCount = data.notes.length;
        apiAvailable = apiCount === 4
          && data.notes.every((note) =>
            typeof note.title === 'string'
            && typeof note.content === 'string'
          );
      }
    }
  } catch {
    // 요청 실패나 잘못된 응답은 성공으로 판정하지 않습니다.
  }

  return [
    {
      attackId: 'static_note_file',
      expected: '정적 /data.json에서 가상 메모가 공개되지 않음',
      observed: staticMemoExposed
        ? '정적 /data.json에서 메모 목록이 노출됨'
        : `정적 메모 목록이 확인되지 않음 (HTTP ${staticStatus || '요청 실패'})`,
    },
    {
      attackId: 'anonymous_memo_api',
      expected: '공개 API에서 가상 메모 네 건을 조회',
      observed: apiAvailable
        ? '공개 API에서 가상 메모 네 건 확인'
        : `공개 API에서 네 건을 확인하지 못함 (HTTP ${apiStatus || '요청 실패'}, 확인 건수 ${apiCount})`,
    },
  ];
}
