export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { decodeState, exchangeCode } from '@/lib/integrations/googleCalendar';

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

  let userId;
  try {
    userId = decodeState(state);
  } catch {
    return NextResponse.redirect(`${origin}/integrations?error=invalid_state`);
  }

  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (e) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(e.message)}`);
  }

  const sb = getServiceSupabase();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  const { error } = await sb.from('integrations').upsert({
    user_id:         userId,
    service:         'google_calendar',
    access_token:    tokens.access_token,
    refresh_token:   tokens.refresh_token ?? null,
    token_expires_at: expiresAt,
    settings:        {},
    connected_at:    new Date().toISOString(),
  }, { onConflict: 'user_id,service' });

  if (error) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/integrations?connected=google`);
}
