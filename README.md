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


## 가상 메모 노출 점검 및 잔여 위험

### 1. 점검 목적

실습용 가상 메모 문장이 공개 파일이나 배포된 웹페이지에 남아 있는지 확인한다.

점검 대상 문장:
- 실습용 가상 과제 기록
- 실습용 가상 포트폴리오 기록
- 실습용 가상 리추얼 기록
- 실습용 가상 행정 기록

점검 결과와 공개 API의 잔여 위험은 구분하여 기록한다.

### 2. GitHub 최신 파일 점검

GitHub의 최신 main 브랜치를 가져온 뒤 점검한다.

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse --short HEAD
```

최신 브랜치에서 가상 메모 문장을 검색한다.

```bash
git grep -n -F \
  -e "실습용 가상 과제 기록" \
  -e "실습용 가상 포트폴리오 기록" \
  -e "실습용 가상 리추얼 기록" \
  -e "실습용 가상 행정 기록" \
  origin/main -- . ':!README.md'
```

공개 화면 및 API 관련 폴더도 별도로 확인한다.

```bash
git grep -n -F \
  -e "실습용 가상 과제 기록" \
  -e "실습용 가상 포트폴리오 기록" \
  -e "실습용 가상 리추얼 기록" \
  -e "실습용 가상 행정 기록" \
  origin/main -- public src api
```

검색 결과가 없으면 해당 검색 범위에서 일치하는 문장을 찾지 못한 것이다. Git grep은 검색 결과가 없을 때 종료 코드 1을 반환할 수 있으며, 이는 검색 오류를 의미하지 않는다.

### 3. 현재 배포 파일 점검

현재 배포 주소를 기준으로 공개 HTML을 내려받아 검색한다.

```bash
SITE="https://choi-bujang-secret-vault-b4zg.vercel.app"
mkdir -p .audit-deployment
curl -fsS "$SITE/" -o .audit-deployment/index.html
```

HTML에서 가상 메모 문장을 검색한다.

```bash
grep -nF \
  -e "실습용 가상 과제 기록" \
  -e "실습용 가상 포트폴리오 기록" \
  -e "실습용 가상 리추얼 기록" \
  -e "실습용 가상 행정 기록" \
  .audit-deployment/index.html
```

HTML이 참조하는 JavaScript 파일도 확인한다.

```bash
grep -oE '<script[^>]+src="[^"]+"' .audit-deployment/index.html
```

확인된 JavaScript 파일도 내려받아 동일한 문장 검색을 수행한다. HTML만 검색한 결과로 전체 배포 파일이 깨끗하다고 단정하지 않는다.

### 4. 공개 경로 상태 확인

`data.json` 응답을 확인한다.

```bash
curl -i "$SITE/data.json"
```

현재 확인된 결과는 HTTP 404이다.

API 응답도 확인한다.

```bash
curl -i "$SITE/api/memos"
```

현재 확인된 결과는 HTTP 200이며, 실습용 가상 메모 4건을 반환한다.

### 5. 공개 API의 잔여 위험

현재 `/api/memos`는 별도의 사용자 인증 없이 접근할 수 있는 공개 GET API이다.

따라서 누구나 API 주소에 요청하여 네 건의 가상 메모 내용을 확인할 수 있다.

서버 환경변수의 `SUPABASE_SECRET_KEY`가 브라우저에 노출되지 않는 것과 API가 반환하는 데이터가 비밀로 유지되는 것은 서로 다른 문제이다.

현재 구조에서는 비밀키 자체는 서버에 보관하지만, API 응답 데이터는 공개되어 있다. 실제 개인정보나 비밀 자료를 반환하는 용도로 사용해서는 안 된다.

### 6. 과거 공개 이력에 관한 주의

현재 배포된 `/data.json`이 HTTP 404를 반환하거나 GitHub 최신 파일에서 메모 문장이 검색되지 않더라도, 과거 공개 커밋이나 이전 배포까지 자동으로 삭제되는 것은 아니다.

과거 커밋, 이전 배포, 캐시 및 외부 복사본에 남아 있을 가능성은 별도로 검토해야 한다.

과거 공개 이력까지 확인하고 조치하기 전에는 과거 노출이 완전히 해결되었다고 기록하지 않는다.

### 7. 점검 결과 기록

| 점검 항목 | 결과 |
|---|---|
| 점검 날짜 | 2026-11-06 |
| GitHub 최신 커밋 | 점검 후 기록 |
| GitHub 전체 문장 검색 | 점검 후 기록 |
| public / src / api 검색 | 점검 후 기록 |
| 배포 HTML 검색 | 점검 후 기록 |
| 배포 JavaScript 검색 | 점검 후 기록 |
| `/data.json` | HTTP 404 확인 |
| `/api/memos` | HTTP 200, 가상 메모 4건 반환 확인 |
| 과거 공개 커밋 및 이전 배포 | 별도 확인 필요 |

검색 결과는 실제 명령 실행 후 기록한다. 확인하지 않은 항목을 이상 없음으로 표시하지 않는다.
