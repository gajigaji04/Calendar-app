import { getSupabase } from '@/lib/supabase';

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function generateDates(startDate, recurrence, recurrenceEnd) {
  const result = [];
  const endDate = recurrenceEnd ? new Date(recurrenceEnd + 'T00:00:00') : null;
  const maxCounts = { daily: 90, weekly: 52, monthly: 24, yearly: 5 };
  const max = maxCounts[recurrence] || 1;
  const cur = new Date(startDate + 'T00:00:00');
  for (let i = 0; i < max; i++) {
    if (endDate && cur > endDate) break;
    result.push(toDateStr(new Date(cur)));
    if (recurrence === 'daily')        cur.setDate(cur.getDate() + 1);
    else if (recurrence === 'weekly')  cur.setDate(cur.getDate() + 7);
    else if (recurrence === 'monthly') cur.setMonth(cur.getMonth() + 1);
    else if (recurrence === 'yearly')  cur.setFullYear(cur.getFullYear() + 1);
  }
  return result;
}

export async function getTasksByUser(userId) {
  const { data } = await getSupabase().from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  return data ?? [];
}

export async function getTasksByDate(userId, date) {
  const { data } = await getSupabase().from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at');
  return data ?? [];
}

export async function getTasksByDateRange(userId, start, end) {
  // date가 범위 내이거나, 기간 일정(deadline)이 범위에 걸치는 경우 모두 포함
  const { data } = await getSupabase().from('tasks')
    .select('*')
    .eq('user_id', userId)
    .lte('date', end)
    .or(`date.gte.${start},deadline.gte.${start}`)
    .order('date');
  return data ?? [];
}

export async function createTask(task) {
  // recurrence 컬럼이 DB에 없을 때를 대비해 기본값일 경우 제외
  const { recurrence, recurrence_end, recurrence_id, ...base } = task;
  const hasRecurrence = recurrence && recurrence !== 'none';

  // NOT NULL 컬럼에 null 이 들어가지 않도록 기본값 보장
  const withDefaults = {
    description: '',
    category:    '',
    ...base,
  };

  if (!hasRecurrence) {
    const payload = { id: crypto.randomUUID(), ...withDefaults };
    const { data, error } = await getSupabase().from('tasks').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  const recurrenceId = crypto.randomUUID();
  const dates = generateDates(task.date, recurrence, recurrence_end);
  const payloads = dates.map(d => ({
    id: crypto.randomUUID(),
    ...withDefaults,
    date: d,
    recurrence,
    recurrence_end: recurrence_end || null,
    recurrence_id: recurrenceId,
  }));

  const { data, error } = await getSupabase().from('tasks').insert(payloads).select();
  if (error) throw new Error(error.message);
  return data[0];
}

export async function updateTask(id, updates) {
  const { error } = await getSupabase().from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id) {
  const { error } = await getSupabase().from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRecurringSeries(recurrenceId) {
  const { error } = await getSupabase().from('tasks').delete().eq('recurrence_id', recurrenceId);
  if (error) throw new Error(error.message);
}

export async function getUpcomingDeadlines(userId, from, to) {
  const { data } = await getSupabase().from('tasks')
    .select('*')
    .eq('user_id', userId)
    .not('deadline', 'is', null)
    .gte('deadline', from)
    .lte('deadline', to)
    .neq('completed', true)
    .order('deadline');
  return data ?? [];
}

export async function getTasksByUserIds(userIds, start, end) {
  const { data } = await getSupabase().from('tasks')
    .select('*')
    .in('user_id', userIds)
    .gte('date', start)
    .lte('date', end)
    .order('date');
  return data ?? [];
}

export async function toggleComplete(id, currentValue) {
  const { error } = await getSupabase().from('tasks')
    .update({ completed: !currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
