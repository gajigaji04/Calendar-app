export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const oerr  = searchParams.get('error');

  if (oerr) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(oerr)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/integrations?error=missing_params`);
  }

  // state 검증
  let userId;
  try {
    const raw      = Buffer.from(state, 'base64url').toString();
    const colonIdx = raw.lastIndexOf(':');
    userId         = raw.slice(0, colonIdx);
    const ts       = Number(raw.slice(colonIdx + 1));
    if (!userId || isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) throw new Error();
  } catch {
    return NextResponse.redirect(`${origin}/integrations?error=invalid_state`);
  }

  // Authorization Code → Access Token 교환
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`;

  let tokenData;
  try {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.SLACK_CLIENT_ID     ?? '',
        client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
        code,
        redirect_uri:  redirectUri,
      }),
    });
    tokenData = await res.json();
    if (!tokenData.ok) {
      throw new Error(tokenData.error ?? 'Slack token exchange failed');
    }
  } catch (e) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(e.message)}`);
  }

  const webhook = tokenData.incoming_webhook;
  if (!webhook?.url) {
    return NextResponse.redirect(`${origin}/integrations?error=no_webhook`);
  }

  // integrations 저장
  const sb = getServiceSupabase();
  const { error: dbErr } = await sb.from('integrations').upsert({
    user_id:      userId,
    service:      'slack',
    access_token: webhook.url,          // webhook URL을 토큰으로 저장
    settings: {
      webhookUrl:   webhook.url,
      channel:      webhook.channel,
      channel_id:   webhook.channel_id,
      team_name:    tokenData.team?.name ?? null,
      notify:       { daily: false, due_soon: false },
    },
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,service' });

  if (dbErr) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(dbErr.message)}`);
  }

  return NextResponse.redirect(`${origin}/integrations?connected=slack`);
}
