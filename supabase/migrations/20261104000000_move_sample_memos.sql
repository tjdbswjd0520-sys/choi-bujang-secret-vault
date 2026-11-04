-- BYTE BACK 2단계: 학습용 가상 메모 이전
-- owner_id는 향후 소유자 UUID를 기록하기 위한 nullable 컬럼입니다.
-- auth.users 외래키는 생성하지 않습니다.
-- 실제 개인정보, 비밀번호, 토큰, 서버 키는 이 테이블에 넣지 마세요.

create table if not exists public.learning_memos (
  id uuid primary key,
  owner_id uuid,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

comment on column public.learning_memos.owner_id is
  '학습용 소유자 UUID 자리표시자. auth.users 외래키 없음.';

-- RLS를 활성화합니다. 별도 정책을 만들지 않으므로 RLS 기준 기본 거부입니다.
alter table public.learning_memos enable row level security;

-- 명시적으로 PUBLIC, anon, authenticated의 테이블 권한을 모두 회수합니다.
revoke all privileges
  on table public.learning_memos
  from public, anon, authenticated;

-- 학습용 가상 메모 네 건. owner_id는 아직 지정하지 않습니다.
insert into public.learning_memos (id, owner_id, title, content)
values
  ('a1111111-1111-4111-8111-111111111111', null, '과제', '실습용 가상 과제 기록'),
  ('a2222222-2222-4222-8222-222222222222', null, '포트폴리오', '실습용 가상 포트폴리오 기록'),
  ('a3333333-3333-4333-8333-333333333333', null, '아침 리추얼', '실습용 가상 리추얼 기록'),
  ('a4444444-4444-4444-8444-444444444444', null, '훈련 행정 자료', '실습용 가상 행정 기록')
on conflict (id) do nothing;
