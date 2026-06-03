import { getSupabase } from '@/lib/supabase';

export async function createTeam(name, description, userId, displayName, email) {
  const sb = getSupabase();
  const teamId     = crypto.randomUUID();
  // Math.random() 대신 crypto API 사용 (암호학적으로 안전한 난수)
  const inviteCode = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    b => (b % 36).toString(36)
  ).join('');
  const { data: team, error: te } = await sb.from('teams')
    .insert({ id: teamId, name, description: description || null, owner_id: userId, created_by: userId, invite_code: inviteCode })
    .select().single();
  if (te) throw new Error(te.message);

  const { error: me } = await sb.from('team_members').insert({
    team_id: team.id, user_id: userId, display_name: displayName, email, role: 'owner',
  });
  if (me) throw new Error(me.message);
  return team;
}

export async function getUserTeams(userId) {
  const { data, error } = await getSupabase()
    .from('team_members')
    .select('role, joined_at, teams(id, name, description, owner_id, invite_code, created_at)')
    .eq('user_id', userId)
    .order('joined_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({ ...r.teams, myRole: r.role }));
}

export async function getTeam(teamId) {
  const { data, error } = await getSupabase()
    .from('teams').select('*').eq('id', teamId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getTeamMembers(teamId) {
  const { data, error } = await getSupabase()
    .from('team_members').select('*').eq('team_id', teamId).order('joined_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function joinTeamByCode(inviteCode, userId, displayName, email) {
  const sb = getSupabase();
  const { data: team, error: te } = await sb.from('teams')
    .select('id, name').eq('invite_code', inviteCode.trim()).single();
  if (te || !team) throw new Error('초대 코드가 올바르지 않습니다.');

  const { error: me } = await sb.from('team_members').insert({
    team_id: team.id, user_id: userId, display_name: displayName, email, role: 'member',
  });
  if (me) {
    if (me.code === '23505') throw new Error('이미 해당 팀의 멤버입니다.');
    throw new Error(me.message);
  }
  return team;
}

export async function leaveTeam(teamId, userId) {
  const { error } = await getSupabase().from('team_members')
    .delete().eq('team_id', teamId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function removeMember(teamId, userId) {
  const { error } = await getSupabase().from('team_members')
    .delete().eq('team_id', teamId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteTeam(teamId) {
  const { error } = await getSupabase().from('teams').delete().eq('id', teamId);
  if (error) throw new Error(error.message);
}

export async function transferOwnership(teamId, newOwnerId, currentOwnerId) {
  const res = await fetch('/api/teams/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, newOwnerId, currentUserId: currentOwnerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '권한 위탁 실패');
}

export async function regenerateInviteCode(teamId) {
  const code = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    b => (b % 36).toString(36)
  ).join('');
  const { error } = await getSupabase().from('teams')
    .update({ invite_code: code }).eq('id', teamId);
  if (error) throw new Error(error.message);
  return code;
}
