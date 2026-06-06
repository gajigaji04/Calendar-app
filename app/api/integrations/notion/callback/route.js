export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
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
  const notionClientId     = process.env.NOTION_CLIENT_ID;
  const notionClientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!notionClientId || !notionClientSecret) {
    return NextResponse.redirect(`${origin}/integrations?error=notion_not_configured`);
  }

  const redirectUri   = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/notion/callback`;
  const credentials   = Buffer.from(`${notionClientId}:${notionClientSecret}`).toString('base64');

  let tokenData;
  try {
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_description ?? err.error ?? `token exchange failed (${res.status})`);
    }
    tokenData = await res.json();
  } catch (e) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(e.message)}`);
  }

  // integrations 저장 (database_id는 유저가 이후 선택)
  const sb = getServiceSupabase();
  const { error: dbErr } = await sb.from('integrations').upsert({
    user_id:      userId,
    service:      'notion',
    access_token: tokenData.access_token,
    settings: {
      workspace_id:   tokenData.workspace_id   ?? null,
      workspace_name: tokenData.workspace_name ?? null,
      bot_id:         tokenData.bot_id         ?? null,
      database_id:    null,
      database_title: null,
    },
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,service' });

  if (dbErr) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(dbErr.message)}`);
  }

  return NextResponse.redirect(`${origin}/integrations?connected=notion`);
}
