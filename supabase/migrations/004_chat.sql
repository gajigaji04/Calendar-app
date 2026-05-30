-- ================================================================
-- 004_chat.sql
-- 팀/개인 채팅 메시지 테이블
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ================================================================

create table if not exists messages (
  id          uuid        primary key default gen_random_uuid(),
  room_id     text        not null,
  sender_id   uuid        not null,
  sender_name text        not null default '',
  content     text        not null default '',
  created_at  timestamptz not null default now()
);

-- 기존 테이블이 구 버전이면 누락 컬럼을 추가
alter table messages add column if not exists room_id     text        not null default '';
alter table messages add column if not exists sender_id   uuid        not null default '00000000-0000-0000-0000-000000000000';
alter table messages add column if not exists sender_name text        not null default '';
alter table messages add column if not exists content     text        not null default '';
alter table messages add column if not exists created_at  timestamptz not null default now();

create index if not exists idx_messages_room_created
  on messages(room_id, created_at desc);

alter table messages enable row level security;

-- 읽기: 인증된 사용자 모두 허용 (앱 레벨에서 접근 가능 room만 표시)
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages
  for select using (auth.role() = 'authenticated');

-- 쓰기: sender_id 가 본인이어야 함
drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages
  for insert with check (sender_id = auth.uid());

comment on table messages is '팀 그룹채팅 및 1:1 DM 메시지. room_id 형식: team:{uuid} 또는 dm:{uid1}_{uid2}';

-- Supabase Realtime 활성화 (이미 활성화되어 있으면 무시)
alter publication supabase_realtime add table messages;
