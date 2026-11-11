// ALEPH SDP 9단계: 도플갱어 탐지기 (Burst Read 감지)
export async function detect(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { action: "observe" };
  }

  // 사용자(sub)별 GET 요청 시각(timestamp) 수집
  const userEvents = {};

  for (const ev of events) {
    const method = ev?.method;
    const sub = ev?.identity?.sub;
    const at = ev?.at;

    // 계약된 3가지 값(at, method, identity.sub)만 처리
    if (!sub || !at) continue;
    if (typeof method === 'string' && method.toUpperCase() !== 'GET') continue;

    const time = new Date(at).getTime();
    if (isNaN(time)) continue;

    if (!userEvents[sub]) {
      userEvents[sub] = [];
    }
    userEvents[sub].push(time);
  }

  const WINDOW_MS = 10 * 60 * 1000; // 10분 (600,000ms)

  for (const sub of Object.keys(userEvents)) {
    const times = userEvents[sub].sort((a, b) => a - b);
    let left = 0;

    // 슬라이딩 윈도우 방식으로 10분 구간 내 요청 건수 계산 (> 120건, 즉 121건 이상 탐지)
    for (let right = 0; right < times.length; right++) {
      while (times[right] - times[left] > WINDOW_MS) {
        left++;
      }
      const count = right - left + 1;
      if (count > 120) {
        return {
          action: "propose_revocation",
          reasonCode: "burst_read",
          subject: sub
        };
      }
    }
  }

  return { action: "observe" };
}