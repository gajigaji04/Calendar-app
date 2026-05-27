export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';
import {
  getEvents, eventToTask, createEvent,
  refreshAccessToken,
} from '@/lib/integrations/googleCalendar';
import { createTask, getTasksByUser } from '@/models/taskModel';

/** 토큰 만료 시 자동 갱신 */
async function ensureFreshToken(row, sb) {
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt <= new Date(Date.now() + 60_000);

  if (needsRefresh && row.refresh_token) {
    const fresh = await refreshAccessToken(row.refresh_token);
    const newExpiry = new Date(Date.now() + (fresh.expires_in ?? 3600) * 1000).toISOString();
    await sb.from('integrations').update({
      access_token:     fresh.access_token,
      token_expires_at: newExpiry,
    }).eq('user_id', row.user_id).eq('service', 'google_calendar');
    return fresh.access_token;
  }
  return row.access_token;
}

/**
 * POST /api/integrations/google/sync
 * body: { direction: 'import' | 'export', taskIds?: string[] }
 *
 * import: Google Calendar → 우리 앱 (중복 제외)
 * export: 선택한 태스크 → Google Calendar
 */
export async function POST(request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { direction = 'import', taskIds = [] } = body;

  const sb = getServiceSupabase();

  // integration 레코드 가져오기
  const { data: row, error: rowErr } = await sb
    .from('integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('service', 'google_calendar')
    .single();

  if (rowErr || !row) {
    return NextResponse.json({ error: 'Google Calendar가 연결되지 않았습니다.' }, { status: 400 });
  }

  const accessToken = await ensureFreshToken(row, sb);

  if (direction === 'import') {
    // 이벤트 가져오기
    const events = await getEvents(accessToken, 30).catch(e => { throw e; });

    // 기존 google_event_id 목록 (중복 방지)
    const existing = await getTasksByUser(user.id);
    const existingIds = new Set(existing.map(t => t.google_event_id).filter(Boolean));

    const toCreate = events
      .filter(e => e.id && !existingIds.has(e.id))
      .map(e => ({ ...eventToTask(e, user.id), google_event_id: e.id }));

    let created = 0;
    for (const task of toCreate) {
      try {
        // createTask는 user_id, title, date 등을 기대함
        await sb.from('tasks').insert({
          id:              crypto.randomUUID(),
          user_id:         task.user_id,
          title:           task.title,
          date:            task.date,
          deadline:        task.deadline,
          completed:       false,
          priority:        'medium',
          category:        'Google Calendar',
          google_event_id: task.google_event_id,
        });
        created++;
      } catch { /* skip */ }
    }

    // last_synced_at 업데이트
    await sb.from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('service', 'google_calendar');

    return NextResponse.json({ ok: true, imported: created, skipped: events.length - created });

  } else if (direction === 'export') {
    // 선택한 태스크를 Google Calendar에 이벤트로 추가
    if (taskIds.length === 0) {
      return NextResponse.json({ error: '내보낼 태스크를 선택하세요.' }, { status: 400 });
    }

    const all   = await getTasksByUser(user.id);
    const tasks = all.filter(t => taskIds.includes(t.id));
    let   exported = 0;

    for (const task of tasks) {
      try {
        const event = await createEvent(accessToken, task);
        // google_event_id 저장
        await sb.from('tasks')
          .update({ google_event_id: event.id })
          .eq('id', task.id);
        exported++;
      } catch { /* skip */ }
    }

    await sb.from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('service', 'google_calendar');

    return NextResponse.json({ ok: true, exported });
  }

  return NextResponse.json({ error: 'direction은 import 또는 export여야 합니다.' }, { status: 400 });
}

/** DELETE — 연결 해제 */
export async function DELETE() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const sb = getServiceSupabase();
  await sb.from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('service', 'google_calendar');

  return NextResponse.json({ ok: true });
}
