// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const container = document.createElement('div');
      container.className = 'identity-view';

      const getModeText = (mode) => {
        if (mode === 'demo') return '예제 자료';
        if (mode === 'disconnected') return '연결 없음';
        if (mode === 'unknown') return '확인 불가';
        return '';
      };

      const getDeviceStatusText = (status) => {
        if (status === 'compliant') return '보안 기준 충족';
        if (status === 'noncompliant') return '보안 기준 미중족';
        if (status === 'unknown') return '확인 불가';
        return status || '확인 불가';
      };

      const getSessionStatusText = (status) => {
        if (status === 'active') return '활성';
        if (status === 'expired') return '만료';
        if (status === 'revoked') return '철회됨';
        if (status === 'unknown') return '확인 불가';
        return status || '확인 불가';
      };

      const status = me?.status || 'loading';
      const mode = me?.mode;
      const modeText = getModeText(mode);

      // 1. 로딩 상태 처리
      if (status === 'loading') {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'identity-loading';
        loadingEl.textContent = modeText ? `불러오는 중 (${modeText})` : '불러오는 중';
        container.appendChild(loadingEl);
        return container;
      }

      // 2. 오류 상태 처리 (이전 사용자 정보가 남지 않도록 새로운 컨테이너에 오류 메시지만 렌더링)
      if (status === 'error') {
        const errorEl = document.createElement('div');
        errorEl.className = 'identity-error';
        const serverMessage = me?.error?.message || '알 수 없는 오류';
        const modeSuffix = modeText ? ` (${modeText})` : '';
        errorEl.textContent = `연결 실패: ${serverMessage}${modeSuffix}`;
        container.appendChild(errorEl);
        return container;
      }

      // 3. 정상(ok) 상태 및 데이터 렌더링
      if (status === 'ok' && me?.data) {
        const { user, device, session } = me.data;

        if (modeText) {
          const modeEl = document.createElement('div');
          modeEl.className = 'identity-mode-badge';
          modeEl.textContent = modeText;
          container.appendChild(modeEl);
        }

        if (user) {
          const userEl = document.createElement('div');
          userEl.className = 'identity-user';
          userEl.textContent = `사용자: ${user.label || user.id || '확인 불가'}`;
          container.appendChild(userEl);
        }

        if (device) {
          const deviceEl = document.createElement('div');
          deviceEl.className = `identity-device status-${device.status || 'unknown'}`;
          const deviceStatusStr = getDeviceStatusText(device.status);
          deviceEl.textContent = `기기: ${device.label || device.id || '확인 불가'} (${deviceStatusStr})`;
          container.appendChild(deviceEl);
        }

        if (session) {
          const sessionEl = document.createElement('div');
          sessionEl.className = `identity-session status-${session.status || 'unknown'}`;
          const sessionStatusStr = getSessionStatusText(session.status);
          sessionEl.textContent = `세션: ${sessionStatusStr}`;
          container.appendChild(sessionEl);
        }

        return container;
      }

      // 기본 폴백
      const fallbackEl = document.createElement('div');
      fallbackEl.textContent = modeText ? `확인 불가 (${modeText})` : '확인 불가';
      container.appendChild(fallbackEl);

      return container;
    },
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}