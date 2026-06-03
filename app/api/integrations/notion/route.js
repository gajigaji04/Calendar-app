export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';
import { getUserPlan, planAllows, planGateResponse } from '@/lib/planCheck';

/** PATCH — OAuth 후 데이터베이스 선택 저장 */
export async function PATCH(request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!planAllows(plan, 'pro')) return planGateResponse();

  const { databaseId, databaseTitle } = await request.json().catch(() => ({}));
  if (!databaseId) return NextResponse.json({ error: 'databaseId가 필요합니다.' }, { status: 400 });

  const sb = getServiceSupabase();
  const { data: row } = await sb
    .from('integrations').select('settings')
    .eq('user_id', user.id).eq('service', 'notion').single();

  if (!row) return NextResponse.json({ error: 'Notion이 연결되지 않았습니다.' }, { status: 400 });

  const { error } = await sb.from('integrations')
    .update({ settings: { ...row.settings, database_id: databaseId, database_title: databaseTitle ?? null } })
    .eq('user_id', user.id).eq('service', 'notion');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE — 연결 해제 */
export async function DELETE() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  await getServiceSupabase()
    .from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('service', 'notion');

  return NextResponse.json({ ok: true });
}
