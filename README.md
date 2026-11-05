# BYTE BACK 방어전 시작 틀 R5

이 저장소는 BYTE BACK 방어전의 단계별 학습용 자료실입니다. 포함된 메모 네 건은 실습용 가상 자료입니다. 실제 학생 자료, 개인정보, 비밀번호, 토큰, 비밀 키를 넣지 마세요.

## 현재 단계: 2단계

2단계에서는 브라우저가 정적 파일 `/data.json`을 직접 읽지 않습니다. 브라우저는 `/api/memos`를 요청하고, Vercel 서버 함수가 Supabase의 `learning_memos` 테이블에서 가상 메모를 조회합니다.

데이터 흐름:

1. 브라우저가 `GET /api/memos`를 요청합니다.
2. `api/memos.js`가 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 읽습니다.
3. 서버 함수가 Supabase `learning_memos` 테이블을 조회합니다.
4. 서버 함수는 메모 제목, 내용, 작성 시각만 브라우저에 반환합니다.

## 중요한 보안 한계

현재 `/api/memos`에는 로그인이나 사용자 인증이 없습니다. 따라서 누구나 이 주소를 직접 호출해 네 건의 가상 메모를 읽을 수 있습니다.

서버 전용 `SUPABASE_SECRET_KEY`는 브라우저 파일, API 응답, 로그에 포함하지 않습니다. 하지만 서버 함수가 공개되어 있으므로 이 구조를 비공개 자료 보호 기능으로 간주하면 안 됩니다. 실제 개인 자료를 제공하려면 사용자 인증, 사용자별 권한 확인, 소유자 기준 조회, 적절한 RLS 정책을 추가해야 합니다.

`SUPABASE_SECRET_KEY`는 Vercel 프로젝트의 Settings → Environment Variables에서 서버 환경변수로 등록합니다. 키 값은 소스 코드, GitHub, 브라우저 코드에 넣거나 채팅으로 공유하지 마세요. 변수 이름은 정확히 `SUPABASE_SECRET_KEY`여야 합니다. Supabase 주소는 `SUPABASE_URL`에 등록합니다.

## 빌드와 배포

`vercel.json`은 정적 결과물 디렉터리로 `public`을 사용합니다. `npm run build`는 다음과 같이 동작합니다.

- 1단계: `data.json`을 `public/data.json`으로 복사합니다.
- 2단계 이후: `public/data.json`을 생성하지 않습니다.
- Vercel 배포 빌드: 배포 저장소, 커밋, 주소 정보를 검증하고 `public/aleph.json`을 생성합니다.
- `npm run build -- --local`: 로컬 화면 확인용 빌드이며 배포 식별 파일을 생성하지 않습니다.

`public/aleph.json`은 배포 식별 정보입니다. 이 파일만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 실제 공개 저장소의 커밋과 배포 결과를 별도로 확인해야 합니다.

## 2단계 확인 방법

배포 후 다음을 확인합니다.

- `/` 화면에서 가상 메모 카드 네 건이 표시되는지 확인합니다.
- `/api/memos`를 직접 열어 가상 메모 응답을 확인합니다.
- `/data.json`에는 메모가 제공되지 않아야 합니다.
- 브라우저 개발자 도구의 응답과 정적 파일에서 서버 비밀 키가 발견되지 않아야 합니다.

`src/attack-check.mjs`는 단계별 자기 점검 코드입니다. 자기 점검 결과는 운영 심판의 판정이 아닙니다.

## 다음 단계 작업 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽고 한 번에 한 제작 단위만 요청하세요. 비밀번호, 토큰, 기기 개인키, 서버 전용 키, 실제 개인정보와 메모 본문을 코드, Git, 브라우저 파일, 제출 묶음에 넣지 않습니다.

`npm run bundle`과 `bundle-notes.json`은 1단계의 세 걸음에 포함되지 않습니다. `src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 학습용 가상 요청 연습이며 운영 심판의 결과가 아닙니다.
