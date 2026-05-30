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
