export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerUser, getServiceSupabase } from '@/lib/supabaseServer';
import { testConnection } from '@/lib/integrations/notion';

/** POST — 토큰 + DB ID 연결 */
export async function POST(request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { token, databaseId } = await request.json().catch(() => ({}));
  if (!token || !databaseId) {
    return NextResponse.json({ error: 'token과 databaseId가 필요합니다.' }, { status: 400 });
  }

  // 연결 테스트
  let dbInfo;
  try {
    dbInfo = await testConnection(token, databaseId);
  } catch (e) {
    return NextResponse.json({ error: `연결 실패: ${e.message}` }, { status: 400 });
  }

  const sb = getServiceSupabase();
  const { error } = await sb.from('integrations').upsert({
    user_id:      user.id,
    service:      'notion',
    access_token: token,
    settings:     { databaseId, databaseTitle: dbInfo.title },
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,service' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, database: dbInfo });
}

/** DELETE — 연결 해제 */
export async function DELETE() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const sb = getServiceSupabase();
  await sb.from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('service', 'notion');

  return NextResponse.json({ ok: true });
}
