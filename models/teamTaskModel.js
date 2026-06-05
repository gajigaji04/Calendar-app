import { getSupabase } from '@/lib/supabase';

export async function getTeamTasks(teamId) {
  const { data, error } = await getSupabase()
    .from('team_tasks')
    .select('*')
    .eq('team_id', teamId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createTeamTask(task) {
  const { data, error } = await getSupabase()
    .from('team_tasks')
    .insert({ id: crypto.randomUUID(), ...task })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleTeamTask(id, completed) {
  const { error } = await getSupabase()
    .from('team_tasks')
    .update({ completed: !completed })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTeamTask(id) {
  const { error } = await getSupabase()
    .from('team_tasks')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateTeamTask(id, updates) {
  const { error } = await getSupabase()
    .from('team_tasks')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** 나에게 할당된 팀 태스크 (미완료 전체) */
export async function getMyTeamAssignedTasks(userId) {
  const { data } = await getSupabase()
    .from('team_tasks')
    .select('*, teams(id, name)')
    .eq('assigned_to', userId)
    .eq('completed', false)
    .order('date')
    .limit(20);
  return (data ?? []).map(t => ({
    ...t,
    deadline:  t.date,
    _teamId:   t.teams?.id,
    _teamName: t.teams?.name,
    _source:   'team',
  }));
}

/** 마감 임박 팀 태스크 조회 (date를 마감일로 취급, RLS로 내 팀 것만 반환) */
export async function getUpcomingTeamDeadlines(start, end) {
  const { data } = await getSupabase()
    .from('team_tasks')
    .select('*, teams(id, name)')
    .gte('date', start)
    .lte('date', end)
    .neq('completed', true)
    .order('date');
  return (data ?? []).map(t => ({
    ...t,
    deadline:   t.date,
    _teamId:    t.teams?.id,
    _teamName:  t.teams?.name,
    _source:    'team',
  }));
}
