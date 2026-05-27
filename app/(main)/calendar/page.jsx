'use client';
import { Suspense } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByDateRange, getTasksByDate, toggleComplete, updateTask } from '@/models/taskModel';
import TaskModal from '@/components/task/TaskModal';
import { downloadICS } from '@/lib/exportICS';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';

const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const KO_HOLIDAYS = {
  '2024-01-01':'신정','2024-02-09':'설날 전날','2024-02-10':'설날','2024-02-11':'설날','2024-02-12':'대체공휴일',
  '2024-03-01':'삼일절','2024-05-05':'어린이날','2024-05-06':'대체공휴일','2024-05-15':'부처님오신날',
  '2024-06-06':'현충일','2024-08-15':'광복절',
  '2024-09-16':'추석 전날','2024-09-17':'추석','2024-09-18':'추석',
  '2024-10-03':'개천절','2024-10-09':'한글날','2024-12-25':'성탄절',
  '2025-01-01':'신정','2025-01-28':'설날 전날','2025-01-29':'설날','2025-01-30':'설날','2025-02-03':'대체공휴일',
  '2025-03-01':'삼일절','2025-03-03':'대체공휴일',
  '2025-05-05':'어린이날·부처님오신날','2025-05-06':'대체공휴일',
  '2025-06-06':'현충일','2025-08-15':'광복절',
  '2025-10-03':'개천절','2025-10-05':'추석 전날','2025-10-06':'추석','2025-10-07':'추석',
  '2025-10-08':'대체공휴일','2025-10-09':'한글날','2025-12-25':'성탄절',
  '2026-01-01':'신정','2026-02-16':'설날 전날','2026-02-17':'설날','2026-02-18':'설날',
  '2026-03-01':'삼일절','2026-03-02':'대체공휴일',
  '2026-05-05':'어린이날','2026-05-24':'부처님오신날',
  '2026-06-06':'현충일','2026-08-15':'광복절',
  '2026-09-24':'추석 전날','2026-09-25':'추석','2026-09-26':'추석',
  '2026-10-03':'개천절','2026-10-09':'한글날','2026-12-25':'성탄절',
};

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
  const [tasks,    setTasks]    = useState([]);
  const [dayPanel, setDayPanel] = useState(null);
  const [dayTasks, setDayTasks] = useState([]);
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
    const data = await getTasksByDateRange(user.id, start, end);
    setTasks(data);
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
    const data = await getTasksByDate(user.id, dateStr);
    setDayTasks(data);
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
              year={year} month={month} tasks={tasks}
              todayStr={todayStr} onDayClick={openDayPanel}
              onAddClick={ds => setModal({ _date: ds })}
              onTaskMove={handleTaskMove}
            />
          )}
          {mode === 'week' && (
            <WeekView
              weekStart={weekStart} tasks={tasks}
              todayStr={todayStr} onDayClick={openDayPanel}
              onAddClick={ds => setModal({ _date: ds })}
            />
          )}
          {mode === 'year' && (
            <YearView year={year} tasks={tasks} todayStr={todayStr} onMonthClick={m => { setMode('month'); setMonth(m); }} />
          )}
        </div>
      </div>

      {/* 날짜 패널 */}
      {dayPanel && (
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

          {dayTasks.length === 0 ? (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
              할일이 없습니다
            </p>
          ) : dayTasks.map(t => {
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
        </div>
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
              const data = await getTasksByDate(user.id, dayPanel);
              setDayTasks(data);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── 월 뷰 ── */
function MonthView({ year, month, tasks, todayStr, onDayClick, onAddClick, onTaskMove }) {
  const [dragOverDate, setDragOverDate] = useState(null);
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
        const spanCount = weekSpans.length;

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

            {/* 날짜 셀 */}
            <div className="full-grid">
              {week.map((cell, ci) => {
                const cellTasks    = cell.ds ? (taskMap[cell.ds] || []) : [];
                const isToday      = cell.ds === todayStr;
                const holiday      = cell.ds ? KO_HOLIDAYS[cell.ds] : null;
                const isSun        = ci === 0;
                const isSat        = ci === 6;
                const isHolidayDay = holiday || isSun;

                return (
                  <div
                    key={wi * 7 + ci}
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
                          >
                              {t.recurrence && t.recurrence !== 'none' && <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 3, opacity: 0.6 }} />}
                            {t.title}{dl && <> <span className={`cell-dl ${dl.cls}`}>{dl.label}</span></>}
                          </div>
                        );
                      })}
                      {cellTasks.length > 2 && (
                        <div className="more-label">+{cellTasks.length - 2}</div>
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
function WeekView({ weekStart, tasks, todayStr, onDayClick, onAddClick }) {
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

  const spanBarH = spanTasks.length > 0 ? spanTasks.length * 20 + 6 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 기간 일정 바 */}
      {spanTasks.length > 0 && (
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
        </div>
      )}

      <div className="week-grid" style={{ flex: 1, minHeight: 0 }}>
        {weekDays.map(({ d, ds }) => {
          const isToday      = ds === todayStr;
          const dayTasks     = taskMap[ds] || [];
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
