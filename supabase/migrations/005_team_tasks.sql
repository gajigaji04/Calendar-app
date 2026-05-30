-- ================================================================
-- 005_team_tasks.sql
-- 팀 공유 플래너 할 일 테이블
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ================================================================

create table if not exists team_tasks (
  id          uuid        primary key default gen_random_uuid(),
  team_id     uuid        not null references teams(id) on delete cascade,
  title       text        not null,
  description text        not null default '',
  date        date        not null,
  deadline    date,
  priority    text        not null default 'medium' check (priority in ('low','medium','high')),
  completed   boolean     not null default false,
  assigned_to uuid        references auth.users(id) on delete set null,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists idx_team_tasks_team_date
  on team_tasks(team_id, date);

alter table team_tasks enable row level security;

-- 팀원이면 조회·추가·수정·삭제 모두 허용
drop policy if exists "team_task_access" on team_tasks;
create policy "team_task_access" on team_tasks
  for all using (
    exists (
      select 1 from team_members
      where team_members.team_id = team_tasks.team_id
        and team_members.user_id = auth.uid()
    )
  );

comment on table team_tasks is '팀 공유 플래너 할 일. 팀원 누구나 추가·완료·삭제 가능.';
