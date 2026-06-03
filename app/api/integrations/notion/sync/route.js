export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';
import { getPages, pageToTask, createPage } from '@/lib/integrations/notion';
import { getTasksByUser } from '@/models/taskModel';

/**
 * POST /api/integrations/notion/sync
 * body: { direction: 'import' | 'export', taskIds?: string[] }
 */
export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { direction = 'import', taskIds = [] } = await request.json().catch(() => ({}));

  const sb = getServiceSupabase();
  const { data: row } = await sb
    .from('integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('service', 'notion')
    .single();

  if (!row) return NextResponse.json({ error: 'Notion이 연결되지 않았습니다.' }, { status: 400 });

  const token      = row.access_token;
  const databaseId = row.settings?.database_id ?? row.settings?.databaseId; // 구 버전 호환
  if (!databaseId) return NextResponse.json({ error: '동기화할 데이터베이스를 먼저 선택해주세요.' }, { status: 400 });

  if (direction === 'import') {
    const pages = await getPages(token, databaseId);

    const existing    = await getTasksByUser(user.id);
    const existingIds = new Set(existing.map(t => t.notion_page_id).filter(Boolean));

    const toCreate = pages.filter(p => !existingIds.has(p.id));
    let created = 0;

    for (const page of toCreate) {
      try {
        const task = pageToTask(page, user.id);
        await sb.from('tasks').insert({
          id:             crypto.randomUUID(),
          ...task,
          notion_page_id: page.id,
        });
        created++;
      } catch { /* skip */ }
    }

    await sb.from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('service', 'notion');

    return NextResponse.json({ ok: true, imported: created, total: pages.length });

  } else if (direction === 'export') {
    const today = new Date().toISOString().split('T')[0];
    const all   = await getTasksByUser(user.id);
    const tasks = taskIds.length > 0
      ? all.filter(t => taskIds.includes(t.id) && !t.notion_page_id)
      : all.filter(t => !t.completed && !t.notion_page_id && t.date >= today);
    let exported = 0;

    for (const task of tasks) {
      try {
        const page = await createPage(token, task, databaseId);
        await sb.from('tasks')
          .update({ notion_page_id: page.id })
          .eq('id', task.id);
        exported++;
      } catch { /* skip */ }
    }

    await sb.from('integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('service', 'notion');

    return NextResponse.json({ ok: true, exported });
  }

  return NextResponse.json({ error: '잘못된 direction' }, { status: 400 });
}
