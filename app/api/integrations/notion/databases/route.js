export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';

/** GET — 유저가 연동한 Notion 워크스페이스에서 접근 가능한 데이터베이스 목록 */
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data: row } = await sb
    .from('integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('service', 'notion')
    .single();

  if (!row?.access_token) {
    return NextResponse.json({ error: 'Notion이 연결되지 않았습니다.' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method:  'POST',
      headers: {
        Authorization:    `Bearer ${row.access_token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        filter:    { property: 'object', value: 'database' },
        sort:      { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 20,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Notion API ${res.status}`);
    }

    const { results } = await res.json();
    const databases = results.map(db => ({
      id:    db.id,
      title: db.title?.[0]?.plain_text ?? '(제목 없음)',
      url:   db.url ?? null,
    }));

    return NextResponse.json({ databases });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
