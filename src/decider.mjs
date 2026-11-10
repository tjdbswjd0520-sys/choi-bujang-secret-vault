// ALEPH SDP 8단계: 자원 구역(Zone)별 화이트리스트 접근 제어 판정기
export const RULE_IDS = Object.freeze([
  'device_registered',
  'step_up_required',
  'zone_access_control'
]);

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

  // 2. 계약된 재인증(stepUp) 검사 유지
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
      ruleIds: ['device_registered', 'step_up_required'],
    };
  }

  // 3. 7단계 복합 이상 신호 검사 유지 (시각 + 낯선 네트워크 + 다량 읽기 AND)
  const signals = request?.signals || {};
  const recentEvents = Array.isArray(request?.recentEvents) ? request.recentEvents : [];

  const isUnusualHour =
    typeof signals.hour === 'number' && (signals.hour < 6 || signals.hour > 22);

  const isUnfamiliarNetwork =
    typeof signals.network === 'string' &&
    signals.network !== 'trusted' &&
    signals.network !== 'office' &&
    signals.network !== 'home' &&
    signals.network !== '';

  const isLargeRead = recentEvents.some(
    (ev) =>
      (typeof ev?.count === 'number' && ev.count >= 10) ||
      (typeof ev?.readCount === 'number' && ev.readCount >= 10) ||
      ev?.action === 'read_memos' ||
      ev?.action === 'read_many' ||
      ev?.read === true
  );

  if (isUnusualHour && isUnfamiliarNetwork && isLargeRead) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'step_up',
      reasonCode: 'step_up_required',
      ruleIds: ['device_registered', 'step_up_required'],
    };
  }

  // 4. 8단계 구역별 접근 제어 (경로 유연성 반영)
  const method = (request?.method || 'GET').toUpperCase();
  const rawPath = (request?.path || '').split('?')[0];
  const parts = rawPath.split('/').filter(Boolean); // 예: ['api', 'notes', 'demo'] 또는 ['notes', 'demo']

  // (1) 강사 자료 및 관리 경로: 무조건 거부
  if (rawPath.includes('instructor')) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'instructor_resource_forbidden',
      ruleIds: ['zone_access_control'],
    };
  }

  // (2) 공지사항(notices): GET 읽기만 허용 (목록 또는 개별)
  if (parts.includes('notices')) {
    if (method === 'GET') {
      return {
        schema: 'aleph.decision.v1',
        requestId: request?.requestId,
        decision: 'allow',
        reasonCode: 'approved_notice_read',
        ruleIds: ['device_registered', 'zone_access_control'],
      };
    }
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'notice_access_forbidden',
      ruleIds: ['zone_access_control'],
    };
  }

  // (3) 메모(memos / notes): GET 방식이고 단일 ID가 지정된 경우만 허용
  if (parts.includes('memos') || parts.includes('notes')) {
    if (method === 'GET') {
      const resourceIdx = parts.findIndex(p => p === 'memos' || p === 'notes');
      const subParts = parts.slice(resourceIdx + 1); // 메모 경로 이후 조각들

      // 조각이 1개이고(ID 지정), export 같은 기능 경로가 아니면 허용 (/notes/:id, /api/memos/:id 등)
      if (subParts.length === 1 && subParts[0] !== '' && subParts[0] !== 'export') {
        return {
          schema: 'aleph.decision.v1',
          requestId: request?.requestId,
          decision: 'allow',
          reasonCode: 'approved_memo_read',
          ruleIds: ['device_registered', 'zone_access_control'],
        };
      }
    }
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'memo_access_forbidden',
      ruleIds: ['zone_access_control'],
    };
  }

  // (4) 그 외 알 수 없는 모든 경로는 거부
  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'deny',
    reasonCode: 'unknown_path_forbidden',
    ruleIds: ['zone_access_control'],
  };
}