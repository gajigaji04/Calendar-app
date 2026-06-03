export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';
import { sendMessage, buildDailySummary, buildDueSoonAlert } from '@/lib/integrations/slack';
import { getTasksByUser } from '@/models/taskModel';
import { getUserPlan, planAllows, planGateResponse } from '@/lib/planCheck';

/** PATCH — 알림 옵션만 업데이트 */
export async function PATCH(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  const plan = await getUserPlan(user.id);
  if (!planAllows(plan, 'pro')) return planGateResponse();

  const { notify } = await request.json().catch(() => ({}));
  const sb = getServiceSupabase();

  const { data: row } = await sb
    .from('integrations')
    .select('settings')
    .eq('user_id', user.id).eq('service', 'slack').single();

  if (!row) return NextResponse.json({ error: '연결 안됨' }, { status: 400 });

  await sb.from('integrations')
    .update({ settings: { ...row.settings, notify } })
    .eq('user_id', user.id).eq('service', 'slack');

  return NextResponse.json({ ok: true });
}

/** DELETE — 연결 해제 */
export async function DELETE(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const sb = getServiceSupabase();
  await sb.from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('service', 'slack');

  return NextResponse.json({ ok: true });
}

/** POST /api/integrations/slack/send — 수동 알림 전송 */
export async function PUT(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { type = 'daily' } = await request.json().catch(() => ({}));
  const sb  = getServiceSupabase();

  const { data: row } = await sb
    .from('integrations')
    .select('access_token, settings')
    .eq('user_id', user.id).eq('service', 'slack').single();

  if (!row) return NextResponse.json({ error: '연결 안됨' }, { status: 400 });

  const today = new Date().toISOString().split('T')[0];
  const tasks = await getTasksByUser(user.id);

  let payload;
  if (type === 'daily') {
    payload = buildDailySummary(tasks, today);
  } else if (type === 'due_soon') {
    payload = buildDueSoonAlert(tasks, today);
    if (!payload) return NextResponse.json({ ok: true, message: '임박 마감 없음' });
  } else {
    return NextResponse.json({ error: '알 수 없는 type' }, { status: 400 });
  }

  await sendMessage(row.access_token, payload);
  await sb.from('integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('service', 'slack');

  return NextResponse.json({ ok: true });
}
