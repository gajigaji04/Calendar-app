export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMessage, buildDailySummary, buildDueSoonAlert } from '@/lib/integrations/slack';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * GET /api/cron/slack-notify
 * Vercel이 매일 오전 9시(UTC)에 호출
 * CRON_SECRET 헤더로 무단 호출 차단
 */
export async function GET(request) {
  // Vercel cron은 Authorization: Bearer <CRON_SECRET> 헤더를 붙여 호출
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb    = getServiceClient();
  const today = new Date().toISOString().split('T')[0];

  // Slack 연동된 유저 전체 조회
  const { data: integrations, error } = await sb
    .from('integrations')
    .select('user_id, access_token, settings')
    .eq('service', 'slack');

  if (error) {
    console.error('[cron/slack-notify] integrations 조회 실패:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0, skipped = 0;

  for (const row of integrations ?? []) {
    const notify     = row.settings?.notify ?? {};
    const webhookUrl = row.access_token;

    if (!webhookUrl) { skipped++; continue; }

    // 일일 요약
    if (notify.daily) {
      try {
        const { data: tasks } = await sb
          .from('tasks')
          .select('*')
          .eq('user_id', row.user_id);

        const payload = buildDailySummary(tasks ?? [], today);
        await sendMessage(webhookUrl, payload);

        await sb.from('integrations')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('user_id', row.user_id)
          .eq('service', 'slack');

        sent++;
      } catch (e) {
        console.error(`[cron/slack-notify] daily 전송 실패 (${row.user_id}):`, e.message);
      }
    }

    // 마감 임박
    if (notify.due_soon) {
      try {
        const { data: tasks } = await sb
          .from('tasks')
          .select('*')
          .eq('user_id', row.user_id)
          .eq('completed', false)
          .not('deadline', 'is', null);

        const payload = buildDueSoonAlert(tasks ?? [], today);
        if (payload) await sendMessage(webhookUrl, payload);
        sent++;
      } catch (e) {
        console.error(`[cron/slack-notify] due_soon 전송 실패 (${row.user_id}):`, e.message);
      }
    }

    if (!notify.daily && !notify.due_soon) skipped++;
  }

  console.log(`[cron/slack-notify] 완료: sent=${sent}, skipped=${skipped}`);
  return NextResponse.json({ ok: true, sent, skipped });
}
