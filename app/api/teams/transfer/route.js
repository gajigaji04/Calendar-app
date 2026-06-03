import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req) {
  try {
    const { teamId, newOwnerId, currentUserId } = await req.json();

    if (!teamId || !newOwnerId || !currentUserId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    const admin = getAdmin();

    // 현재 요청자가 실제 팀장인지 검증
    const { data: team, error: teamErr } = await admin
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (team.owner_id !== currentUserId) {
      return NextResponse.json({ error: '팀장만 권한을 위탁할 수 있습니다.' }, { status: 403 });
    }
    if (newOwnerId === currentUserId) {
      return NextResponse.json({ error: '자기 자신에게는 위탁할 수 없습니다.' }, { status: 400 });
    }

    // 새 팀장이 실제 멤버인지 확인
    const { data: targetMember, error: memberErr } = await admin
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', newOwnerId)
      .single();

    if (memberErr || !targetMember) {
      return NextResponse.json({ error: '대상 멤버가 이 팀에 존재하지 않습니다.' }, { status: 404 });
    }

    // 새 팀장 role → owner
    const { error: e1 } = await admin
      .from('team_members')
      .update({ role: 'owner' })
      .eq('team_id', teamId)
      .eq('user_id', newOwnerId);
    if (e1) throw new Error(e1.message);

    // 기존 팀장 role → member
    const { error: e2 } = await admin
      .from('team_members')
      .update({ role: 'member' })
      .eq('team_id', teamId)
      .eq('user_id', currentUserId);
    if (e2) throw new Error(e2.message);

    // teams.owner_id 업데이트
    const { error: e3 } = await admin
      .from('teams')
      .update({ owner_id: newOwnerId })
      .eq('id', teamId);
    if (e3) throw new Error(e3.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[transfer-ownership]', err);
    return NextResponse.json({ error: err.message || '권한 위탁 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
