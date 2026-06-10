export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { getServiceSupabase } from '@/lib/supabaseServer';
import { sendTeamInviteEmail } from '@/lib/mailer';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { teamId, email } = await request.json();
  if (!teamId || !email) return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '유효하지 않은 이메일입니다.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // 팀 정보 + 초대 코드 조회
  const { data: team, error: te } = await sb.from('teams').select('id, name, invite_code').eq('id', teamId).single();
  if (te || !team) return NextResponse.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });

  // 요청자가 팀 멤버인지 확인
  const { data: membership } = await sb.from('team_members')
    .select('role').eq('team_id', teamId).eq('user_id', user.id).single();
  if (!membership) return NextResponse.json({ error: '팀 멤버만 초대할 수 있습니다.' }, { status: 403 });

  const inviterName = user.user_metadata?.name || user.email?.split('@')[0] || '팀원';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!process.env.RESEND_API_KEY) {
    // 개발 모드: 콘솔 출력
    console.log(`\n[팀 초대 이메일 - 개발 모드]`);
    console.log(`  수신: ${email}`);
    console.log(`  팀: ${team.name}`);
    console.log(`  초대 코드: ${team.invite_code}`);
    console.log(`  링크: ${appUrl}/teams/join?code=${team.invite_code}\n`);
    return NextResponse.json({ ok: true, devMode: true });
  }

  await sendTeamInviteEmail(email, inviterName, team.name, team.invite_code, appUrl);
  return NextResponse.json({ ok: true });
}
