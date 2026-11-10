// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

export async function decide(request) {
  // [1단계] 기존 기기 등록 검사 (등록되지 않은 기기는 무조건 차단)
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

  // [2단계] 재인증(추가 확인 완료) 검사: 심판이 계약한 stepUp 필드만 검사
  const stepUp = request?.stepUp;
  const isStepUpVerified = Boolean(
    stepUp?.verified &&
    typeof stepUp?.authAgeSeconds === 'number' &&
    stepUp.authAgeSeconds >= 0
  );
  if (isStepUpVerified) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'allow',
      reasonCode: 'approved_after_step_up',
      ruleIds: ['device_registered'],
    };
  }

  // [3단계] 복합 이상 신호 검사 (시각 + 낯선 네트워크 + 다량 읽기 모두 충족될 때만 AND 조건)
  const signals = request?.signals || {};
  const recentEvents = Array.isArray(request?.recentEvents) ? request.recentEvents : [];

  // (A) 시각 조건: 심판이 보내준 시간(hour)이 6시 이전 또는 22시 이후인지 검사
  const isUnusualHour =
    typeof signals.hour === 'number' && (signals.hour < 6 || signals.hour > 22);

  // (B) 낯선 네트워크 조건: 안전한 네트워크('trusted', 'office', 'home')가 아닌지 검사
  const isUnfamiliarNetwork =
    typeof signals.network === 'string' &&
    signals.network !== 'trusted' &&
    signals.network !== 'office' &&
    signals.network !== 'home' &&
    signals.network !== '';

  // (C) 다량 읽기 조건: 최근 사건 목록(recentEvents)에서 횟수가 10번 이상이거나 다량 읽기 행위가 있는지 검사
  const isLargeRead = recentEvents.some(
    (ev) =>
      (typeof ev?.count === 'number' && ev.count >= 10) ||
      (typeof ev?.readCount === 'number' && ev.readCount >= 10) ||
      ev?.action === 'read_memos' ||
      ev?.action === 'read_many' ||
      ev?.read === true
  );

  // 세 조건이 "모두 참(AND)"일 때만 추가 확인(step_up) 판정 내리기
  if (isUnusualHour && isUnfamiliarNetwork && isLargeRead) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'step_up',
      reasonCode: 'step_up_required',
      ruleIds: ['device_registered', 'step_up_required'],
    };
  }

  // [4단계] 그 외의 정상적인 요청은 모두 허용(allow)
  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}