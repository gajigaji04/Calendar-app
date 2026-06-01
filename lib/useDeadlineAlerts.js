'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUpcomingDeadlines } from '@/models/taskModel';
import { getUpcomingTeamDeadlines } from '@/models/teamTaskModel';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(base, n) {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DeadlineAlertsContext = createContext(null);

export function DeadlineAlertsProvider({ children }) {
  const { user } = useAuth();
  const [overdue,  setOverdue]  = useState([]);
  const [dueToday, setDueToday] = useState([]);
  const [soon,     setSoon]     = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    const t = todayStr();
    const [personal, team] = await Promise.all([
      getUpcomingDeadlines(user.id, addDays(t, -30), addDays(t, 7)),
      getUpcomingTeamDeadlines(addDays(t, -30), addDays(t, 7)).catch(() => []),
    ]);
    const all = [...personal, ...team];
    setOverdue(all.filter(x => x.deadline < t));
    setDueToday(all.filter(x => x.deadline === t));
    setSoon(all.filter(x => x.deadline > t));
  }, [user]);

  useEffect(() => {
    load();
    const id = setInterval(load, 300_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <DeadlineAlertsContext.Provider value={{
      overdue, dueToday, soon,
      urgentCount: overdue.length + dueToday.length,
      refresh: load,
    }}>
      {children}
    </DeadlineAlertsContext.Provider>
  );
}

export function useDeadlineAlerts() {
  const ctx = useContext(DeadlineAlertsContext);
  if (!ctx) throw new Error('useDeadlineAlerts must be inside DeadlineAlertsProvider');
  return ctx;
}
