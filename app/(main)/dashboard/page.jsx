'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByDate, getTasksByDateRange, createTask, toggleComplete } from '@/models/taskModel';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';

const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getGreeting(h) {
  if (h < 6)  return '늦은 밤이에요, 무리하지 마세요';
  if (h < 12) return '좋은 아침이에요, 오늘도 화이팅!';
  if (h < 14) return '점심 시간이에요, 잠깐 쉬어가세요';
  if (h < 18) return '좋은 오후에요, 집중력을 높여봐요';
  if (h < 21) return '저녁 시간이에요, 오늘 하루 수고했어요';
  return '편안한 밤 되세요';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const now      = new Date();
  const todayStr = toDateStr(now);

  const [todayTasks,  setTodayTasks]  = useState([]);
  const [miniYear,    setMiniYear]    = useState(now.getFullYear());
  const [miniMonth,   setMiniMonth]   = useState(now.getMonth());
  const [miniTasks,   setMiniTasks]   = useState([]);
  const [addTitle,    setAddTitle]    = useState('');
  const [adding,      setAdding]      = useState(false);
  const [nowMs,       setNowMs]       = useState(() => Date.now());

  const { overdue, dueToday, soon, refresh: refreshAlerts } = useDeadlineAlerts();
  const soonClose = soon.filter(t => {
    const diff = Math.round((new Date(t.deadline + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000);
    return diff <= 3;
  });
  const soonWeek = soon.filter(t => {
    const diff = Math.round((new Date(t.deadline + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000);
    return diff > 3 && diff <= 7;
  });

  const loadToday = useCallback(async () => {
    if (!user) return;
    const data = await getTasksByDate(user.id, todayStr);
    setTodayTasks(data);
  }, [user, todayStr]);

  useEffect(() => { loadToday(); }, [loadToday]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const start = toDateStr(new Date(miniYear, miniMonth, 1));
    const end   = toDateStr(new Date(miniYear, miniMonth + 1, 0));
    getTasksByDateRange(user.id, start, end).then(setMiniTasks);
  }, [user, miniYear, miniMonth]);

  async function handleToggle(id, cur) {
    await toggleComplete(id, cur);
    loadToday();
    refreshAlerts();
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!addTitle.trim() || !user) return;
    setAdding(true);
    await createTask({ user_id: user.id, title: addTitle.trim(), date: todayStr, completed: false, priority: 'medium' });
    setAddTitle('');
    setAdding(false);
    loadToday();
  }

  const done    = todayTasks.filter(t => t.completed).length;
  const pending = todayTasks.filter(t => !t.completed).length;
  const urgentCount = overdue.length + dueToday.length;
  const progressPct = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;

  const firstDay    = new Date(miniYear, miniMonth, 1).getDay();
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const taskDates   = new Set(miniTasks.map(t => t.date));

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── 헤더 ── */}
      <div className="view-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem' }}>
            {getGreeting(now.getHours())}, {user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자'}님!
          </h2>
          <p className="view-sub">
            {now.getFullYear()}년 {now.getMonth()+1}월 {now.getDate()}일 {DAYS[now.getDay()]}요일
          </p>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => router.push('/calendar')}
        >
          <i className="fas fa-calendar-days" /> 캘린더 열기
        </button>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── 통계 카드 4개 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <StatCard icon="fas fa-list-check"     bg="var(--indigo-50)"  color="var(--indigo-600)" num={todayTasks.length} label="오늘 할일" />
          <StatCard icon="fas fa-circle-check"   bg="var(--green-lt)"   color="var(--green)"      num={done}             label="완료" />
          <StatCard icon="fas fa-hourglass-half" bg="var(--amber-lt)"   color="var(--amber)"      num={pending}          label="미완료" />
          <StatCard icon="fas fa-bell"           bg="var(--red-lt)"     color="var(--red)"         num={urgentCount}      label="마감 긴급" urgent={urgentCount > 0} />
        </div>

        {/* ── 진행률 바 ── */}
        {todayTasks.length > 0 && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>오늘 진행률</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--indigo-600)' }}>{progressPct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: progressPct === 100 ? '#059669' : 'var(--indigo-500)',
                borderRadius: 999, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── 메인 그리드 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

          {/* ── 오늘 할일 ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
                <i className="fas fa-list-check" style={{ marginRight: 8, color: 'var(--indigo-600)' }} />
                오늘 할일
              </h3>
              <button className="btn-secondary btn-sm" onClick={() => router.push('/tasks')}>
                전체 보기
              </button>
            </div>

            {/* 빠른 추가 */}
            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="할일 제목 입력 후 Enter..."
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                style={{
                  flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: '7px 12px', fontSize: '0.875rem',
                  background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                }}
              />
              <button type="submit" className="btn-primary btn-sm" disabled={adding}>
                <i className="fas fa-plus" />
              </button>
            </form>

            {todayTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-sub)', fontSize: '0.88rem' }}>
                <i className="fas fa-sun" style={{ fontSize: '1.8rem', marginBottom: 8, display: 'block', opacity: 0.4 }} />
                오늘 등록된 할일이 없어요
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {todayTasks.map(t => (
                  <TodayTaskItem key={t.id} task={t} onToggle={() => handleToggle(t.id, t.completed)} nowMs={nowMs} />
                ))}
              </div>
            )}
          </div>

          {/* ── 오른쪽 컬럼 ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 마감 임박 알림 ── */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
                  <i className="fas fa-clock-rotate-left" style={{ marginRight: 8, color: '#d97706' }} />
                  마감 임박
                </h3>
                {urgentCount > 0 && (
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                    background: 'var(--red-500)', borderRadius: 999,
                    padding: '2px 8px',
                  }}>
                    {urgentCount}건 긴급
                  </span>
                )}
              </div>

              {overdue.length === 0 && dueToday.length === 0 && soonClose.length === 0 && soonWeek.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-sub)', fontSize: '0.83rem' }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '1.5rem', marginBottom: 6, display: 'block', color: '#059669', opacity: 0.7 }} />
                  임박한 마감 일정이 없어요
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <DeadlineGroup
                    label="기한 초과"
                    icon="fa-circle-exclamation"
                    iconColor="var(--red)"
                    bgColor="var(--red-lt)"
                    tasks={overdue}
                    todayStr={todayStr}
                  />
                  <DeadlineGroup
                    label="오늘 마감"
                    icon="fa-circle-dot"
                    iconColor="var(--amber)"
                    bgColor="var(--orange-lt)"
                    tasks={dueToday}
                    todayStr={todayStr}
                  />
                  <DeadlineGroup
                    label="3일 이내"
                    icon="fa-hourglass-half"
                    iconColor="var(--amber)"
                    bgColor="var(--amber-lt)"
                    tasks={soonClose}
                    todayStr={todayStr}
                  />
                  <DeadlineGroup
                    label="이번 주"
                    icon="fa-calendar-week"
                    iconColor="var(--indigo-600)"
                    bgColor="var(--indigo-50)"
                    tasks={soonWeek}
                    todayStr={todayStr}
                  />
                </div>
              )}
            </div>

            {/* ── 미니 캘린더 ── */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1); }
                    else setMiniMonth(m => m - 1);
                  }}
                ><i className="fas fa-chevron-left" /></button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                  {miniYear}년 {MONTHS[miniMonth]}
                </span>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1); }
                    else setMiniMonth(m => m + 1);
                  }}
                ><i className="fas fa-chevron-right" /></button>
              </div>
              <MiniCalendar
                year={miniYear} month={miniMonth}
                firstDay={firstDay} daysInMonth={daysInMonth}
                taskDates={taskDates} todayStr={todayStr}
                onDateClick={ds => router.push(`/calendar?date=${ds}`)}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({ icon, bg, color, num, label, urgent }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: bg, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.05rem',
          boxShadow: urgent ? `0 0 0 3px ${bg}` : 'none',
          animation: urgent ? 'pulse 1.8s infinite' : 'none',
        }}>
          <i className={icon} />
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{num}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ── TodayTaskItem ── */
function TodayTaskItem({ task, onToggle, nowMs }) {
  const now = new Date(nowMs || Date.now());
  let timeLbl = null;
  if (task.due_time && !task.completed) {
    const [hh, mm] = task.due_time.split(':').map(Number);
    const due = new Date(); due.setHours(hh, mm, 0, 0);
    const diff = Math.round((due - now) / 60000);
    if (diff < 0)        timeLbl = { text: `${Math.abs(diff)}분 초과`, color: 'var(--red-500)' };
    else if (diff <= 30) timeLbl = { text: `${diff}분 후`, color: '#ea580c' };
    else if (diff <= 60) timeLbl = { text: `${diff}분 후`, color: '#d97706' };
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderLeft: task.color ? `3px solid ${task.color}` : '1px solid var(--border)',
      opacity: task.completed ? 0.6 : 1,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${task.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
          background: task.completed ? 'var(--indigo-600)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.6rem',
        }}
      >
        {task.completed && <i className="fas fa-check" />}
      </button>

      <span style={{
        flex: 1, fontSize: '0.875rem', color: 'var(--text)', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: task.completed ? 'line-through' : 'none',
      }}>
        {task.recurrence && task.recurrence !== 'none' &&
          <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 4, color: 'var(--indigo-600)', opacity: 0.7 }} />}
        {task.title}
      </span>

      {timeLbl && (
        <span style={{ fontSize: '0.72rem', color: timeLbl.color, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="fas fa-clock" />
          {timeLbl.text}
        </span>
      )}

      {task.priority === 'high' && !timeLbl && (
        <span style={{ fontSize: '0.7rem', color: 'var(--red-500)', fontWeight: 700, flexShrink: 0 }}>높음</span>
      )}
    </div>
  );
}

/* ── DeadlineGroup ── */
function DeadlineGroup({ label, icon, iconColor, bgColor, tasks, todayStr }) {
  if (tasks.length === 0) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.72rem', fontWeight: 700, color: iconColor,
        marginBottom: 5, padding: '0 2px',
      }}>
        <i className={`fas ${icon}`} />
        {label}
        <span style={{ fontWeight: 600, opacity: 0.8 }}>({tasks.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tasks.map(t => <DeadlineItem key={t.id} task={t} iconColor={iconColor} bgColor={bgColor} todayStr={todayStr} />)}
      </div>
    </div>
  );
}

/* ── DeadlineItem ── */
function DeadlineItem({ task, iconColor, bgColor, todayStr }) {
  const dl   = new Date(task.deadline + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  const diff  = Math.round((dl - today) / 86400000);
  const diffLabel = diff < 0 ? `D+${Math.abs(diff)}` : diff === 0 ? 'D-Day' : `D-${diff}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 8,
      background: bgColor, border: '1px solid var(--border)',
    }}>
      <i className="fas fa-clock" style={{ color: iconColor, fontSize: '0.8rem', flexShrink: 0 }} />
      <span style={{
        flex: 1, fontSize: '0.82rem', color: 'var(--text)', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {task.title}
      </span>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: iconColor }}>{diffLabel}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>{task.deadline}</span>
      </div>
    </div>
  );
}

/* ── MiniCalendar ── */
function MiniCalendar({ year, month, firstDay, daysInMonth, taskDates, todayStr, onDateClick }) {
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, ds });
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, padding: '2px 0',
            color: i === 0 ? 'var(--red-500)' : i === 6 ? 'var(--indigo-600)' : 'var(--text-sub)',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const isToday   = cell.ds === todayStr;
          const hasTasks  = taskDates.has(cell.ds);
          const col       = (firstDay + cell.d - 1) % 7;
          return (
            <div
              key={cell.ds}
              onClick={() => onDateClick(cell.ds)}
              style={{
                textAlign: 'center', padding: '5px 2px', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--indigo-600)' : 'transparent',
                color: isToday ? '#fff' : col === 0 ? 'var(--red-500)' : col === 6 ? 'var(--indigo-600)' : 'var(--text)',
                position: 'relative', transition: 'background 120ms',
              }}
            >
              {cell.d}
              {hasTasks && !isToday && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--indigo-500)',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
