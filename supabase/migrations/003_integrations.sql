-- ================================================================
-- 003_integrations.sql
-- 외부 서비스 연동 정보 저장 테이블
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ================================================================

create table if not exists integrations (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  service          text        not null check (service in ('google_calendar', 'notion', 'slack')),
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  settings         jsonb       not null default '{}',
  last_synced_at   timestamptz,
  connected_at     timestamptz not null default now(),
  unique(user_id, service)
);

-- Row Level Security
alter table integrations enable row level security;

drop policy if exists "users_manage_own_integrations" on integrations;
create policy "users_manage_own_integrations"
  on integrations
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- tasks 테이블에 외부 서비스 ID 컬럼 추가 (없으면)
alter table tasks
  add column if not exists google_event_id text,
  add column if not exists notion_page_id  text;

comment on table integrations is '외부 서비스(Google Calendar, Notion, Slack) 연동 토큰 및 설정';
