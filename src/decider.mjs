// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

export async function decide(request) {
  // 1. 기존 기기 등록 검사 유지
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

  // 2. 계약된 재인증 검사: request.stepUp.verified 와 authAgeSeconds 검사
  const stepUp = request?.stepUp;
  const isStepUpVerified = Boolean(stepUp?.verified && typeof stepUp?.authAgeSeconds === 'number' && stepUp.authAgeSeconds >= 0);
  
  if (isStepUpVerified) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'allow',
      reasonCode: 'approved_after_step_up',
      ruleIds: ['device_registered', 'step_up_required'],
    };
  }

  // 3. 복합 이상 신호 감지: 시각·낯선 네트워크·다량 읽기가 함께 발생할 때 step_up 판정
  const signals = request?.signals || {};
  const recentEvents = request?.recentEvents || [];

  const isUnusualHour = 
    signals?.unusualHour === true || 
    (typeof signals?.hour === 'number' && (signals.hour < 6 || signals.hour > 22));

  const isUnfamiliarNetwork = 
    signals?.unfamiliarNetwork === true || 
    (typeof signals?.network === 'string' && signals.network !== 'trusted' && signals.network !== 'office' && signals.network !== 'home' && signals.network !== '');

  const isLargeRead = 
    signals?.largeRead === true || 
    signals?.massRead === true || 
    (Array.isArray(recentEvents) && recentEvents.some(ev => (ev.count && ev.count > 10) || ev.type === 'bulk_read' || ev.action === 'mass_read'));

  if (isUnusualHour && isUnfamiliarNetwork && isLargeRead) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'step_up',
      reasonCode: 'unusual_access_requires_verification',
      ruleIds: ['device_registered', 'step_up_required'],
    };
  }

  // 4. 그 외 정상 사건은 허용
  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}