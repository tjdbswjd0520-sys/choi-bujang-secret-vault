// ALEPH SDP 8단계: 자원 구역(Zone)별 접근 제어 판정기
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

  // 4. 8단계 자원 구역(Zone)별 접근 제어 규칙
  const method = (request?.method || 'GET').toUpperCase();
  const path = request?.path || '';

  // (1) 강사 자료 및 관리 경로: 모두 거부
  if (path.startsWith('/api/instructor') || path.includes('/instructor')) {
    return {
      schema: 'aleph.decision.v1',
      requestId: request?.requestId,
      decision: 'deny',
      reasonCode: 'instructor_resource_forbidden',
      ruleIds: ['zone_access_control'],
    };
  }

  // (2) 공지사항(notices) 제어: GET(읽기)만 허용, 쓰기/수정/삭제(POST, PUT, PATCH, DELETE)는 거부
  if (path.startsWith('/api/notices')) {
    if (method === 'GET') {
      return {
        schema: 'aleph.decision.v1',
        requestId: request?.requestId,
        decision: 'allow',
        reasonCode: 'approved_notice_read',
        ruleIds: ['device_registered', 'zone_access_control'],
      };
    } else {
      return {
        schema: 'aleph.decision.v1',
        requestId: request?.requestId,
        decision: 'deny',
        reasonCode: 'notice_write_forbidden',
        ruleIds: ['zone_access_control'],
      };
    }
  }

  // (3) 메모(memos) 제어: ID가 포함된 개별 조회/수정/삭제는 허용 경로 모양에 따르되, ID가 없는 전체 목록 조회(GET /api/memos 또는 /api/memos/)는 거부
  if (path.startsWith('/api/memos') || path.startsWith('/api/notes')) {
    // ID가 없는 전체 목록 조회(예: 정확히 /api/memos 또는 /api/memos/)인 경우 거부
    const isListQuery = path === '/api/memos' || path === '/api/memos/' || path === '/api/notes' || path === '/api/notes/';
    if (method === 'GET' && isListQuery) {
      return {
        schema: 'aleph.decision.v1',
        requestId: request?.requestId,
        decision: 'deny',
        reasonCode: 'memo_list_forbidden',
        ruleIds: ['zone_access_control'],
      };
    }
  }

  // (5) 그 외 허용된 정상 요청
  return {
    schema: 'aleph.decision.v1',
    requestId: request?.requestId,
    decision: 'allow',
    reasonCode: 'approved',
    ruleIds: ['device_registered'],
  };
}