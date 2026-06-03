export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';

export async function GET(request) {
  const limited = rateLimit(request);
  if (limited) return limited;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('integrations')
    .select('service, settings, last_synced_at, connected_at')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // { google_calendar: {...}, notion: {...}, slack: {...} }
  const map = {};
  for (const row of data ?? []) {
    map[row.service] = {
      connected:      true,
      settings:       row.settings ?? {},
      last_synced_at: row.last_synced_at,
      connected_at:   row.connected_at,
    };
  }
  map._meta = { googleConfigured: !!process.env.GOOGLE_CLIENT_ID };
  return NextResponse.json(map);
}
