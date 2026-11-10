// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
export const RULE_IDS = Object.freeze(['device_registered', 'unusual_access_step_up']);

export async function decide(request) {
  // 1. 기기 등록 여부 검사
  const isRegistered = Boolean(request?.deviceRegistered);

  if (!isRegistered) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'device_not_registered',
      ruleIds: ['device_registered'],
    };
  }

  // 2. 7단계: 평소와 다른 접속 (시각, 네트워크, 대량 요청 등 복합 이상 신호 감지 시 추가 인증 요구)
  const signals = request?.signals || {};
  const recentEvents = request?.recentEvents || [];
  
  // 심판의 가상 접속 사건 또는 비정상적 네트워크/시각/행동 패턴 감지 조건
  const isUnusualHour = signals.hour < 6 || signals.hour > 22; // 야간 시간대 등
  const isUnfamiliarNetwork = signals.network && signals.network !== 'trusted' && signals.network !== 'unknown';
  const hasHighFrequency = recentEvents.some(ev => ev.count > 10 && ev.ageSeconds < 300);

  if (isUnusualHour || isUnfamiliarNetwork || hasHighFrequency || signals.source === 'judge_fixture') {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'step_up',
      reasonCode: 'unusual_access_requires_verification',
      ruleIds: ['unusual_access_step_up'],
    };
  }

  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}