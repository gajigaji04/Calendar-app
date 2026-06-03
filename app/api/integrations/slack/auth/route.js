export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser } from '@/lib/supabaseServer';
import { getUserPlan, planAllows, planGateResponse } from '@/lib/planCheck';

const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';

export async function GET(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const plan = await getUserPlan(user.id);
  if (!planAllows(plan, 'pro')) return planGateResponse();

  if (!process.env.SLACK_CLIENT_ID) {
    return NextResponse.json({ error: 'SLACK_CLIENT_ID가 설정되지 않았습니다.' }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;
  const state = Buffer.from(`${user.id}:${Date.now()}`).toString('base64url');

  const params = new URLSearchParams({
    client_id:    process.env.SLACK_CLIENT_ID,
    scope:        'incoming-webhook',
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${SLACK_AUTH_URL}?${params}`);
}
