'use client';
import { Suspense } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByDateRange, getTasksByDate, getTasksByDeadline, toggleComplete, updateTask } from '@/models/taskModel';
import { getTeamTasksByDateRange } from '@/models/teamTaskModel';
import TaskModal from '@/components/task/TaskModal';
import { downloadICS } from '@/lib/exportICS';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';
import KO_HOLIDAYS from '@/lib/koHolidays';

const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDeadlineInfo(task) {
  if (!task.deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const dl = new Date(task.deadline + 'T00:00:00');
  const diff = Math.round((dl - today) / 86400000);
  if (diff < 0)   return { cls: 'dl-overdue', label: `D+${Math.abs(diff)}` };
  if (diff === 0) return { cls: 'dl-today',   label: 'D-Day' };
  if (diff <= 3)  return { cls: 'dl-soon',    label: `D-${diff}` };
  if (diff <= 7)  return { cls: 'dl-near',    label: `D-${diff}` };
  if (diff <= 14) return { cls: 'dl-week',    label: `D-${diff}` };
  return null;
}

export default function CalendarPageWrapper() {
  return <Suspense><CalendarPage /></Suspense>;
}

function CalendarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { refresh: refreshAlerts } = useDeadlineAlerts();
  const searchParams = useSearchParams();
  const now = new Date();

  const [mode,      setMode]      = useState('month');
  const [year,      setYear]      = useState(now.getFullYear());
  const [month,     setMonth]     = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(now);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [tasks,         setTasks]         = useState([]);
  const [teamTasks,     setTeamTasks]     = useState([]);
  const [dayPanel,      setDayPanel]      = useState(null);
  const [dayTasks,      setDayTasks]      = useState([]);
  const [teamDayTasks,  setTeamDayTasks]  = useState([]);
  const [deadlineTasks, setDeadlineTasks] = useState([]);
  const [modal,    setModal]    = useState(null);

  const todayStr = toDateStr(now);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    let start, end;
    if (mode === 'year') {
      start = `${year}-01-01`; end = `${year}-12-31`;
    } else if (mode === 'week') {
      const we = new Date(weekStart); we.setDate(we.getDate() + 6);
      start = toDateStr(weekStart); end = toDateStr(we);
    } else {
      start = toDateStr(new Date(year, month, 1));
      end   = toDateStr(new Date(year, month + 1, 0));
    }
    const [personalData, teamData] = await Promise.all([
      getTasksByDateRange(user.id, start, end),
      getTeamTasksByDateRange(start, end).catch(() => []),
    ]);
    setTasks(personalData);
    setTeamTasks(teamData);
  }, [user, mode, year, month, weekStart]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const date = searchParams.get('date');
    if (date) openDayPanel(date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDayPanel(dateStr) {
    setDayPanel(dateStr);
    if (!user) return;
    const [scheduled, deadlined, teamDay] = await Promise.all([
      getTasksByDate(user.id, dateStr),
      getTasksByDeadline(user.id, dateStr),
      getTeamTasksByDateRange(dateStr, dateStr).catch(() => []),
    ]);
    setDayTasks(scheduled);
    setDeadlineTasks(deadlined);
    setTeamDayTasks(teamDay);
  }

  async function handleToggle(id, cur) {
    const flip = t => t.id === id ? { ...t, completed: !cur } : t;
    setTasks(prev => prev.map(flip));
    setDayTasks(prev => prev.map(flip));
    try {
      await toggleComplete(id, cur);
      refreshAlerts();
    } catch {
      const revert = t => t.id === id ? { ...t, completed: cur } : t;
      setTasks(prev => prev.map(revert));
      setDayTasks(prev => prev.map(revert));
    }
  }

  async function handleTaskMove(taskId, newDate) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: newDate } : t));
    await updateTask(taskId, { date: newDate });
  }

  function navigate(dir) {
    if (mode === 'year') {
      setYear(y => y + dir);
    } else if (mode === 'week') {
      setWeekStart(ws => {
        const d = new Date(ws);
        d.setDate(d.getDate() + dir * 7);
        return d;
      });
    } else {
      let m = month + dir, y = year;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      setMonth(m); setYear(y);
    }
  }

  function goToday() {
    setYear(now.getFullYear()); setMonth(now.getMonth());
    const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay());
    setWeekStart(d);
  }

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const goTodayRef = useRef(goToday);
  goTodayRef.current = goToday;
  const modalRef = useRef(modal);
  modalRef.current = modal;

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (modalRef.current) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateRef.current(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateRef.current(1); }
      if (e.key === 't' || e.key === 'T') goTodayRef.current();
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setModal({ _date: todayStr });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  let label = '';
  if (mode === 'year') {
    label = `${year}년`;
  } else if (mode === 'week') {
    const we = new Date(weekStart); we.setDate(we.getDate() + 6);
    label = weekStart.getMonth() === we.getMonth()
      ? `${weekStart.getFullYear()}년 ${weekStart.getMonth()+1}월`
      : `${weekStart.getMonth()+1}월 ${weekStart.getDate()}일 — ${we.getMonth()+1}월 ${we.getDate()}일`;
  } else {
    label = `${year}년 ${MONTHS[month]}`;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', minHeight: 0, position: 'relative' }}>
      {/* 메인 캘린더 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '0 20px 20px' }}>
        <div className="view-header">
          <div>
            <h2>캘린더</h2>
            <p className="view-sub">일정을 한눈에 확인하세요</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {['year','month','week'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '5px 12px', fontSize: '0.82rem', cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit',
                    background: mode === m ? 'var(--indigo-600)' : 'var(--surface)',
                    color: mode === m ? '#fff' : 'var(--text)',
                  }}
                >
                  {m === 'year' ? '연도' : m === 'month' ? '월' : '주'}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-chevron-left" /></button>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>
              {label}
            </span>
            <button className="icon-btn" onClick={() => navigate(1)}><i className="fas fa-chevron-right" /></button>
            <button className="btn-secondary btn-sm" onClick={goToday}>오늘</button>
            <button
              className="btn-secondary btn-sm"
              title="현재 기간 ICS 내보내기"
              onClick={() => {
                if (tasks.length === 0) { alert('내보낼 일정이 없습니다.'); return; }
                downloadICS(tasks, `calendar_${label.replace(/\s/g,'')}.ics`);
              }}
            >
              <i className="fas fa-file-export" />
            </button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto', marginTop: 12 }}>
          {mode === 'month' && (
            <MonthView
              year={year} month={month} tasks={tasks} teamTasks={teamTasks}
              todayStr={todayStr} onDayClick={openDayPanel}
              onAddClick={ds => setModal({ _date: ds })}
              onTaskMove={handleTaskMove}
            />
          )}
          {mode === 'week' && (
            <WeekView
              weekStart={weekStart} tasks={tasks} teamTasks={teamTasks}
              todayStr={todayStr} onDayClick={openDayPanel}
              onAddClick={ds => setModal({ _date: ds })}
            />
          )}
          {mode === 'year' && (
            <YearView year={year} tasks={tasks} todayStr={todayStr} onMonthClick={m => { setMode('month'); setMonth(m); }} />
          )}
        </div>
      </div>

      {/* 날짜 패널 — 데스크탑: 사이드, 모바일: 하단 오버레이 */}
      {dayPanel && (
        <>
          {/* 모바일 오버레이 배경 */}
          <div
            className="cal-panel-overlay"
            onClick={() => setDayPanel(null)}
          />
        <div className="card cal-day-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{dayPanel}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-primary btn-sm" onClick={() => setModal({ _date: dayPanel })}>
                <i className="fas fa-plus" />
              </button>
              <button className="icon-btn" onClick={() => setDayPanel(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {dayTasks.length === 0 && deadlineTasks.length === 0 ? (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
              할일이 없습니다
            </p>
          ) : null}

          {dayTasks.map(t => {
            const dl = getDeadlineInfo(t);
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)', cursor: 'pointer',
                  borderLeft: `3px solid ${t.color || 'var(--indigo-500)'}`,
                }}
                onClick={() => setModal(t)}
              >
                <button
                  onClick={e => { e.stopPropagation(); handleToggle(t.id, t.completed); }}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${t.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
                    background: t.completed ? 'var(--indigo-600)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.6rem',
                  }}
                >
                  {t.completed && <i className="fas fa-check" />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.83rem', color: 'var(--text)',
                    textDecoration: t.completed ? 'line-through' : 'none',
                    opacity: t.completed ? 0.5 : 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.recurrence && t.recurrence !== 'none' && <i className="fas fa-repeat" style={{ fontSize: '0.62rem', marginRight: 4, color: 'var(--primary)', opacity: 0.7 }} />}
                    {t.title}
                  </div>
                  {(t.due_time || dl) && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-sub)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                      {t.due_time && <span style={{ color: 'var(--indigo-600)' }}><i className="fas fa-clock" style={{ marginRight: 3 }} />{t.due_time}</span>}
                      {dl && <span className={`deadline-badge ${dl.cls}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}><i className="fas fa-flag" /> {dl.label}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {teamDayTasks.length > 0 && (
            <>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--indigo-600)',
                padding: '4px 0 2px', borderTop: (dayTasks.length > 0 || deadlineTasks.length > 0) ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="fas fa-users" />
                팀 일정
              </div>
              {teamDayTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => router.push(`/teams/${t._teamId}?tab=planner`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99,102,241,0.07)',
                    borderLeft: '3px solid var(--indigo-500)',
                    cursor: 'pointer', transition: 'opacity .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <i className="fas fa-users" style={{ color: 'var(--indigo-600)', fontSize: '0.72rem', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    {t._teamName && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--indigo-600)', marginTop: 1, opacity: 0.8 }}>
                        {t._teamName}
                      </div>
                    )}
                  </div>
                  {t.priority === 'high' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red-500)', flexShrink: 0 }}>긴급</span>
                  )}
                </div>
              ))}
            </>
          )}

          {deadlineTasks.length > 0 && (
            <>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'var(--red-500)',
                padding: '4px 0 2px', borderTop: (dayTasks.length > 0 || teamDayTasks.length > 0) ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className="fas fa-flag" />
                오늘 마감
              </div>
              {deadlineTasks.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239,68,68,0.05)', cursor: 'pointer',
                    borderLeft: `3px solid ${t.color || 'var(--red-500)'}`,
                  }}
                  onClick={() => setModal(t)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); handleToggle(t.id, t.completed); }}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${t.completed ? 'var(--indigo-600)' : 'var(--red-500)'}`,
                      background: t.completed ? 'var(--indigo-600)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.6rem',
                    }}
                  >
                    {t.completed && <i className="fas fa-check" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.83rem', color: 'var(--text)',
                      textDecoration: t.completed ? 'line-through' : 'none',
                      opacity: t.completed ? 0.5 : 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 2 }}>
                      <i className="fas fa-calendar" style={{ marginRight: 3 }} />
                      {t.date} 시작
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        </>
      )}

      {modal && (
        <TaskModal
          task={'_date' in modal ? null : modal}
          defaultDate={modal._date || dayPanel || todayStr}
          onClose={() => setModal(null)}
          onSave={async () => {
            setModal(null);
            await loadTasks();
            if (dayPanel) {
              const [scheduled, deadlined] = await Promise.all([
                getTasksByDate(user.id, dayPanel),
                getTasksByDeadline(user.id, dayPanel),
              ]);
              setDayTasks(scheduled);
              setDeadlineTasks(deadlined);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── 터치 드래그앤드롭 훅 ── */
function useTouchDrag(onTaskMove) {
  const dragging = useRef(null); // { id, date, el, ghost }

  function onTouchStart(e, task) {
    const touch = e.touches[0];
    const el    = e.currentTarget;
    const rect  = el.getBoundingClientRect();

    // 고스트 엘리먼트 생성
    const ghost = el.cloneNode(true);
    ghost.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999; opacity:0.85;
      width:${rect.width}px; left:${rect.left}px; top:${rect.top}px;
      border-radius:4px; font-size:0.68rem; padding:2px 6px;
      background:${el.style.background || 'var(--indigo-100)'};
      box-shadow:0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(ghost);
    dragging.current = { id: task.id, date: task.date, ghost, startX: touch.clientX, startY: touch.clientY };
    el.style.opacity = '0.3';
    dragging.current.sourceEl = el;
  }

  function onTouchMove(e) {
    if (!dragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const { ghost } = dragging.current;
    ghost.style.left = touch.clientX - 40 + 'px';
    ghost.style.top  = touch.clientY - 12 + 'px';

    // 현재 터치 아래 셀 찾기
    ghost.style.display = 'none';
    const below = document.elementFromPoint(touch.clientX, touch.clientY);
    ghost.style.display = '';
    const cell = below?.closest('[data-date]');
    document.querySelectorAll('[data-date]').forEach(c => c.classList.remove('touch-drag-over'));
    if (cell) cell.classList.add('touch-drag-over');
  }

  function onTouchEnd(e) {
    if (!dragging.current) return;
    const { id, date, ghost, sourceEl } = dragging.current;
    ghost.remove();
    if (sourceEl) sourceEl.style.opacity = '';

    const touch = e.changedTouches[0];
    ghost.style.display = 'none';
    const below = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('[data-date]').forEach(c => c.classList.remove('touch-drag-over'));

    const cell    = below?.closest('[data-date]');
    const newDate = cell?.dataset.date;
    if (newDate && newDate !== date) onTaskMove(id, newDate);
    dragging.current = null;
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/* ── 월 뷰 ── */
function MonthView({ year, month, tasks, teamTasks = [], todayStr, onDayClick, onAddClick, onTaskMove }) {
  const [dragOverDate, setDragOverDate] = useState(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchDrag(onTaskMove);
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  const spanTasks = tasks.filter(t => t.deadline && t.deadline > t.date);
  const spanIds   = new Set(spanTasks.map(t => t.id));

  const taskMap = {};
  tasks.forEach(t => {
    if (spanIds.has(t.id)) return;
    if (!taskMap[t.date]) taskMap[t.date] = [];
    taskMap[t.date].push(t);
  });

  const teamSpanTasks = teamTasks.filter(t => t.deadline && t.deadline > t.date);
  const teamSpanIds   = new Set(teamSpanTasks.map(t => t.id));

  const teamTaskMap = {};
  teamTasks.forEach(t => {
    if (teamSpanIds.has(t.id)) return;
    if (!teamTaskMap[t.date]) teamTaskMap[t.date] = [];
    teamTaskMap[t.date].push(t);
  });

  // 같은 날 같은 recurrence_id → 대표 1개만 표시 (중복 제거)
  Object.keys(taskMap).forEach(ds => {
    const seen = new Set();
    taskMap[ds] = taskMap[ds].filter(t => {
      if (!t.recurrence_id) return true;
      if (seen.has(t.recurrence_id)) return false;
      seen.add(t.recurrence_id);
      return true;
    });
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++)
    cells.push({ d: prevDays - firstDay + 1 + i, other: true, ds: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, other: false, ds });
  }
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ d, other: true, ds: null });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="full-grid">
        {DAYS.map(d => <div key={d} className="cal-hdr-cell">{d}</div>)}
      </div>

      {/* 주 행 */}
      {weeks.map((week, wi) => {
        const weekDs    = week.map(c => c.ds).filter(Boolean);
        const wStart    = weekDs[0];
        const wEnd      = weekDs[weekDs.length - 1];
        const weekSpans = wStart && wEnd
          ? spanTasks.filter(t => t.date <= wEnd && t.deadline >= wStart)
          : [];
        const weekTeamSpans = wStart && wEnd
          ? teamSpanTasks.filter(t => t.date <= wEnd && t.deadline >= wStart)
          : [];
        const spanCount = weekSpans.length + weekTeamSpans.length;

        return (
          <div key={wi} style={{ position: 'relative' }}>
            {/* 기간 바 */}
            {weekSpans.map((span, si) => {
              const startIdx = Math.max(0, week.findIndex(c => c.ds && c.ds >= span.date));
              const endIdx   = Math.min(6, [...week].reverse().findIndex(c => c.ds && c.ds <= span.deadline));
              const realEnd  = 6 - endIdx;
              if (startIdx > realEnd) return null;
              const left    = `${(startIdx / 7) * 100}%`;
              const width   = `${((realEnd - startIdx + 1) / 7) * 100}%`;
              const isStart = week[startIdx]?.ds === span.date;
              const isEnd   = week[realEnd]?.ds === span.deadline;
              const isSolo  = isStart && isEnd;
              return (
                <div
                  key={span.id}
                  className={`span-bar${isSolo ? ' span-solo' : isStart ? ' span-start' : isEnd ? ' span-end' : ''}`}
                  style={{
                    position: 'absolute',
                    top: `${30 + si * 18}px`,
                    left, width, zIndex: 2, pointerEvents: 'none',
                    background: span.color || 'var(--indigo-500)',
                    opacity: span.completed ? 0.4 : 0.85,
                  }}
                >
                  {isStart && (
                    <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {span.title}
                    </span>
                  )}
                  {!isStart && isEnd && (
                    <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px' }}>🏁</span>
                  )}
                </div>
              );
            })}

            {/* 팀 기간 바 */}
            {weekTeamSpans.map((span, si) => {
              const startIdx = Math.max(0, week.findIndex(c => c.ds && c.ds >= span.date));
              const endIdx   = Math.min(6, [...week].reverse().findIndex(c => c.ds && c.ds <= span.deadline));
              const realEnd  = 6 - endIdx;
              if (startIdx > realEnd) return null;
              const left    = `${(startIdx / 7) * 100}%`;
              const width   = `${((realEnd - startIdx + 1) / 7) * 100}%`;
              const isStart = week[startIdx]?.ds === span.date;
              const isEnd   = week[realEnd]?.ds === span.deadline;
              const isSolo  = isStart && isEnd;
              return (
                <div
                  key={`team-${span.id}`}
                  className={`span-bar${isSolo ? ' span-solo' : isStart ? ' span-start' : isEnd ? ' span-end' : ''}`}
                  style={{
                    position: 'absolute',
                    top: `${30 + (weekSpans.length + si) * 18}px`,
                    left, width, zIndex: 2, pointerEvents: 'none',
                    background: 'var(--indigo-500)',
                    opacity: span.completed ? 0.4 : 0.78,
                  }}
                >
                  {isStart && (
                    <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <i className="fas fa-users" style={{ fontSize: '0.55rem' }} />{span.title}
                    </span>
                  )}
                  {!isStart && isEnd && <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px' }}>🏁</span>}
                </div>
              );
            })}

            {/* 날짜 셀 */}
            <div className="full-grid">
              {week.map((cell, ci) => {
                const cellTasks     = cell.ds ? (taskMap[cell.ds] || []) : [];
                const cellTeamTasks = cell.ds ? (teamTaskMap[cell.ds] || []) : [];
                const isToday       = cell.ds === todayStr;
                const holiday      = cell.ds ? KO_HOLIDAYS[cell.ds] : null;
                const isSun        = ci === 0;
                const isSat        = ci === 6;
                const isHolidayDay = holiday || isSun;

                return (
                  <div
                    key={wi * 7 + ci}
                    data-date={cell.ds ?? undefined}
                    className={[
                      'full-cell',
                      cell.other   ? 'other-month'  : '',
                      isToday      ? 'today'         : '',
                      isHolidayDay ? 'holiday-cell'  : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => cell.ds && onDayClick(cell.ds)}
                    onDragOver={e => { if (cell.ds) { e.preventDefault(); setDragOverDate(cell.ds); } }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDate(null); }}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOverDate(null);
                      if (!cell.ds) return;
                      try {
                        const { id, date } = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (date !== cell.ds) onTaskMove(id, cell.ds);
                      } catch { /* ignore */ }
                    }}
                    style={dragOverDate === cell.ds ? { outline: '2px dashed var(--primary)', outlineOffset: '-2px' } : undefined}
                  >
                    <div
                      className="cell-head-row"
                      style={spanCount > 0 ? { marginBottom: `${spanCount * 18 + 4}px` } : undefined}
                    >
                      <span className={`cell-num${isHolidayDay ? ' holiday-num' : isSat ? ' saturday-num' : ''}`}>
                        {cell.d}
                      </span>
                      {cell.ds && (
                        <button
                          className="cell-add-btn"
                          onClick={e => { e.stopPropagation(); onAddClick(cell.ds); }}
                        >
                          <i className="fas fa-plus" />
                        </button>
                      )}
                    </div>

                    {holiday && <div className="cell-holiday-name">{holiday}</div>}

                    <div className="cell-tasks">
                      {cellTasks.slice(0, 2).map(t => {
                        const dl = getDeadlineInfo(t);
                        return (
                          <div
                            key={t.id}
                            className={`cell-task ${t.priority || 'low'}${t.completed ? ' done' : ''}`}
                            style={t.color ? { borderLeft: `3px solid ${t.color}` } : undefined}
                            draggable
                            onDragStart={e => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', JSON.stringify({ id: t.id, date: t.date }));
                            }}
                            onTouchStart={e => { e.stopPropagation(); onTouchStart(e, t); }}
                            onTouchMove={e => { e.stopPropagation(); onTouchMove(e); }}
                            onTouchEnd={e => { e.stopPropagation(); onTouchEnd(e); }}
                          >
                            {t.recurrence && t.recurrence !== 'none' && <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 3, opacity: 0.6 }} />}
                            {t.title}{dl && <> <span className={`cell-dl ${dl.cls}`}>{dl.label}</span></>}
                          </div>
                        );
                      })}
                      {cellTeamTasks.slice(0, 1).map(t => (
                        <div
                          key={`team-${t.id}`}
                          className="cell-task"
                          style={{
                            borderLeft: '3px solid var(--indigo-500)',
                            background: 'rgba(99,102,241,0.10)',
                            color: 'var(--indigo-700,#4338ca)',
                            fontStyle: 'italic',
                          }}
                          title={`[${t._teamName ?? '팀'}] ${t.title}`}
                        >
                          <i className="fas fa-users" style={{ fontSize: '0.55rem', marginRight: 3, opacity: 0.7 }} />
                          {t.title}
                        </div>
                      ))}
                      {(cellTasks.length > 2 || cellTeamTasks.length > 1) && (
                        <div className="more-label">
                          +{Math.max(0, cellTasks.length - 2) + Math.max(0, cellTeamTasks.length - 1)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 주 뷰 ── */
function WeekView({ weekStart, tasks, teamTasks = [], todayStr, onDayClick, onAddClick }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return { d, ds: toDateStr(d) };
  });
  const weekStartStr = toDateStr(weekStart);
  const weekEndDate  = new Date(weekStart); weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr   = toDateStr(weekEndDate);

  const spanTasks = tasks.filter(t => t.deadline && t.deadline > t.date &&
    t.date <= weekEndStr && t.deadline >= weekStartStr);
  const spanIds = new Set(spanTasks.map(t => t.id));

  const taskMap = {};
  tasks.forEach(t => {
    if (spanIds.has(t.id)) return;
    if (!taskMap[t.date]) taskMap[t.date] = [];
    taskMap[t.date].push(t);
  });

  const teamSpanTasks = teamTasks.filter(t => t.deadline && t.deadline > t.date &&
    t.date <= weekEndStr && t.deadline >= weekStartStr);
  const teamSpanIds = new Set(teamSpanTasks.map(t => t.id));

  const teamTaskMap = {};
  teamTasks.forEach(t => {
    if (teamSpanIds.has(t.id)) return;
    if (!teamTaskMap[t.date]) teamTaskMap[t.date] = [];
    teamTaskMap[t.date].push(t);
  });

  const spanBarH = (spanTasks.length + teamSpanTasks.length) > 0
    ? (spanTasks.length + teamSpanTasks.length) * 20 + 6
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 기간 일정 바 */}
      {(spanTasks.length > 0 || teamSpanTasks.length > 0) && (
        <div style={{ position: 'relative', height: spanBarH, flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          {spanTasks.map((span, si) => {
            let startIdx = weekDays.findIndex(wd => wd.ds >= span.date);
            if (startIdx < 0) startIdx = 0;
            let endIdx = 6;
            for (let i = 6; i >= 0; i--) {
              if (weekDays[i].ds <= span.deadline) { endIdx = i; break; }
            }
            const count   = endIdx - startIdx + 1;
            const left    = `${(startIdx / 7) * 100}%`;
            const width   = `${(count   / 7) * 100}%`;
            const isStart = weekDays[startIdx]?.ds === span.date;
            const isEnd   = weekDays[endIdx]?.ds   === span.deadline;
            const isSolo  = isStart && isEnd;
            return (
              <div
                key={span.id}
                className={`span-bar${isSolo ? ' span-solo' : isStart ? ' span-start' : isEnd ? ' span-end' : ''}`}
                style={{
                  position: 'absolute', top: si * 20 + 3,
                  left, width, zIndex: 2,
                  background: span.color || 'var(--indigo-500)',
                  opacity: span.completed ? 0.4 : 0.85,
                }}
              >
                <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {isStart ? span.title : (isEnd ? '🏁' : '')}
                </span>
              </div>
            );
          })}
          {teamSpanTasks.map((span, si) => {
            let startIdx = weekDays.findIndex(wd => wd.ds >= span.date);
            if (startIdx < 0) startIdx = 0;
            let endIdx = 6;
            for (let i = 6; i >= 0; i--) {
              if (weekDays[i].ds <= span.deadline) { endIdx = i; break; }
            }
            const left    = `${(startIdx / 7) * 100}%`;
            const width   = `${((endIdx - startIdx + 1) / 7) * 100}%`;
            const isStart = weekDays[startIdx]?.ds === span.date;
            const isEnd   = weekDays[endIdx]?.ds === span.deadline;
            const isSolo  = isStart && isEnd;
            return (
              <div
                key={`team-${span.id}`}
                className={`span-bar${isSolo ? ' span-solo' : isStart ? ' span-start' : isEnd ? ' span-end' : ''}`}
                style={{ position: 'absolute', top: (spanTasks.length + si) * 20 + 3, left, width, zIndex: 2, background: 'var(--indigo-500)', opacity: span.completed ? 0.4 : 0.78 }}
              >
                <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {isStart ? <><i className="fas fa-users" style={{ fontSize: '0.55rem' }} />{span.title}</> : (isEnd ? '🏁' : '')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="week-grid" style={{ flex: 1, minHeight: 0 }}>
        {weekDays.map(({ d, ds }) => {
          const isToday      = ds === todayStr;
          const dayTasks     = taskMap[ds] || [];
          const dayTeamTasks = teamTaskMap[ds] || [];
          const holiday      = KO_HOLIDAYS[ds];
          const isHolidayDay = holiday || d.getDay() === 0;
          return (
            <div key={ds} className={['week-col', isToday ? 'today' : '', isHolidayDay ? 'holiday' : ''].filter(Boolean).join(' ')}>
              <div className={`week-col-hdr${isToday ? ' today' : ''}`} onClick={() => onDayClick(ds)}>
                <span className="week-dow">{DAYS[d.getDay()]}</span>
                <span className={`week-date-num${isToday ? ' today-circle' : ''}`}>{d.getDate()}</span>
                {holiday && <div className="week-holiday-name">{holiday}</div>}
              </div>
              <div className="week-col-body" onClick={() => onDayClick(ds)}>
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    className={`week-task ${t.priority || 'low'}${t.completed ? ' done' : ''}`}
                    style={t.color ? { borderLeft: `3px solid ${t.color}` } : undefined}
                  >
                    {t.recurrence && t.recurrence !== 'none' && <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 3, opacity: 0.6 }} />}
                    <span className="week-task-title">{t.title}</span>
                  </div>
                ))}
                {dayTeamTasks.map(t => (
                  <div
                    key={`team-${t.id}`}
                    className="week-task"
                    style={{
                      borderLeft: '3px solid var(--indigo-500)',
                      background: 'rgba(99,102,241,0.09)',
                      color: 'var(--indigo-700,#4338ca)',
                      fontStyle: 'italic',
                    }}
                    title={`[${t._teamName ?? '팀'}] ${t.title}`}
                  >
                    <i className="fas fa-users" style={{ fontSize: '0.55rem', marginRight: 3, opacity: 0.7 }} />
                    <span className="week-task-title">{t.title}</span>
                  </div>
                ))}
                <button
                  className="week-add-btn"
                  onClick={e => { e.stopPropagation(); onAddClick(ds); }}
                >
                  <i className="fas fa-plus" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 연도 뷰 ── */
function YearView({ year, tasks, todayStr, onMonthClick }) {
  const taskDates = new Set(tasks.map(t => t.date));
  const nowMonth  = new Date().getMonth();
  const nowYear   = new Date().getFullYear();

  return (
    <div className="year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const firstDay    = new Date(year, m, 1).getDay();
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const cells       = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          cells.push({ d, ds });
        }
        return (
          <div key={m} className="year-month-card" onClick={() => onMonthClick(m)}>
            <div className={`year-month-hdr${m === nowMonth && year === nowYear ? ' current' : ''}`}>
              {MONTHS[m]}
            </div>
            <div className="year-mini-grid">
              {DAYS.map(d => <div key={d} className="ymg-hdr">{d}</div>)}
              {cells.map((cell, i) => cell ? (
                <div
                  key={i}
                  className={[
                    'ymg-cell',
                    cell.ds === todayStr   ? 'today'        : '',
                    taskDates.has(cell.ds) ? 'has-tasks'    : '',
                    KO_HOLIDAYS[cell.ds]   ? 'holiday-cell' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {cell.d}
                  {taskDates.has(cell.ds) && cell.ds !== todayStr && <span className="ymg-dot" />}
                </div>
              ) : <div key={i} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
