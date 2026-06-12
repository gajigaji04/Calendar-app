'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByDate, createTask, toggleComplete, updateTask, deleteTask } from '@/models/taskModel';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';
import TaskModal from '@/components/task/TaskModal';

const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function PlannerPage() {
  const { user } = useAuth();
  const { refresh: refreshAlerts } = useDeadlineAlerts();

  const todayStr = toDateStr(new Date());
  const [date,           setDate]           = useState(todayStr);
  const [tasks,          setTasks]          = useState([]);
  const [quickTitle,     setQuickTitle]     = useState('');
  const [quickImportant, setQuickImportant] = useState(false);
  const [quickTime,      setQuickTime]      = useState('');
  const [adding,         setAdding]         = useState(false);
  const [modal,          setModal]          = useState(null);
  const [showCompleted,  setShowCompleted]  = useState(false);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setTasks(await getTasksByDate(user.id, date));
  }, [user, date]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function handleQuickAdd(e) {
    e.preventDefault();
    if (!quickTitle.trim() || !user) return;
    setAdding(true);
    await createTask({
      user_id:  user.id,
      title:    quickTitle.trim(),
      date,
      due_time: quickTime || null,
      priority: quickImportant ? 'high' : 'medium',
      completed: false,
    });
    setQuickTitle('');
    setQuickTime('');
    setQuickImportant(false);
    setAdding(false);
    loadTasks();
  }

  async function handleToggle(id, cur) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !cur } : t));
    await toggleComplete(id, cur);
    refreshAlerts();
  }

  async function handleToggleImportant(task) {
    const np = task.priority === 'high' ? 'medium' : 'high';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: np } : t));
    await updateTask(task.id, { priority: np });
  }

  async function handleDelete(id) {
    if (!window.confirm('이 할일을 삭제할까요?')) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    await deleteTask(id);
    refreshAlerts();
  }

  function navigate(dir) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    setDate(toDateStr(d));
  }

  const d       = new Date(date + 'T00:00:00');
  const isToday = date === todayStr;
  const dateLabel = `${d.getFullYear()}년 ${MONTHS[d.getMonth()]} ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;

  const active    = tasks.filter(t => !t.completed);
  const done      = tasks.filter(t => t.completed);
  const important = active.filter(t => t.priority === 'high');
  const regular   = active.filter(t => t.priority !== 'high');
  const pct       = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700, margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── 헤더 ── */}
      <div className="view-header">
        <div>
          <h2>데일리 플래너</h2>
          <p className="view-sub">하루의 할일을 체계적으로 관리하세요</p>
        </div>
        {!isToday && (
          <button className="btn-secondary btn-sm" onClick={() => setDate(todayStr)}>
            <i className="fas fa-rotate-left" style={{ marginRight: 5 }} />오늘로
          </button>
        )}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── 날짜 네비게이션 ── */}
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="icon-btn" onClick={() => navigate(-1)} title="이전 날">
              <i className="fas fa-chevron-left" />
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 5 }}>
                {isToday && (
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 800, padding: '2px 9px',
                    borderRadius: 999, background: 'var(--primary)', color: '#fff',
                  }}>오늘</span>
                )}
                <span style={{ fontSize: '1rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text)' }}>
                  {dateLabel}
                </span>
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
                  background: 'var(--bg)', color: 'var(--text-sub)', fontSize: '0.78rem',
                  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                }}
              />
            </div>
            <button className="icon-btn" onClick={() => navigate(1)} title="다음 날">
              <i className="fas fa-chevron-right" />
            </button>
          </div>

          {/* 진행률 */}
          {tasks.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>오늘 진행률</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--primary)' }}>
                  {done.length}/{tasks.length} ({pct}%)
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: pct === 100 ? 'var(--green)' : 'var(--primary)',
                  borderRadius: 999, transition: 'width .5s ease',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* ── 빠른 추가 ── */}
        <form
          onSubmit={handleQuickAdd}
          className="card"
          style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="할일 추가..."
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 12px', fontSize: '0.88rem',
                background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={adding || !quickTitle.trim()}
              style={{ flexShrink: 0 }}
            >
              {adding
                ? <i className="fas fa-spinner fa-spin" />
                : <><i className="fas fa-plus" style={{ marginRight: 5 }} />추가</>}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* 중요 표시 토글 */}
            <button
              type="button"
              onClick={() => setQuickImportant(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: quickImportant ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: `1px solid ${quickImportant ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                fontSize: '0.8rem', color: quickImportant ? '#d97706' : 'var(--text-sub)',
                fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0,
              }}
            >
              <i className={`${quickImportant ? 'fas' : 'far'} fa-star`} style={{ fontSize: '0.78rem' }} />
              중요 표시
            </button>

            {/* 시간 설정 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-clock" style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }} />
              <input
                type="time"
                value={quickTime}
                onChange={e => setQuickTime(e.target.value)}
                style={{
                  border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px',
                  background: 'var(--bg)', color: 'var(--text)', fontSize: '0.8rem',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
          </div>
        </form>

        {/* ── 빈 상태 ── */}
        {tasks.length === 0 && (
          <div style={{
            padding: '52px 20px', textAlign: 'center', color: 'var(--text-sub)',
            background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
            border: '1.5px dashed var(--border)',
          }}>
            <i className="fas fa-clipboard-list" style={{
              fontSize: '2.2rem', marginBottom: 14, display: 'block', opacity: 0.2,
            }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 4 }}>등록된 할일이 없어요</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>위의 입력창에서 할일을 자유롭게 추가해보세요</div>
          </div>
        )}

        {/* ── 중요한 일정 ── */}
        {important.length > 0 && (
          <TaskSection
            icon="fa-star"
            iconColor="#d97706"
            bgColor="rgba(245,158,11,0.05)"
            borderColor="rgba(245,158,11,0.2)"
            title="중요한 일정"
            tasks={important}
            onToggle={handleToggle}
            onToggleImportant={handleToggleImportant}
            onEdit={setModal}
            onDelete={handleDelete}
          />
        )}

        {/* ── 오늘 할일 ── */}
        {regular.length > 0 && (
          <TaskSection
            icon="fa-list-check"
            iconColor="var(--primary)"
            bgColor="var(--surface)"
            borderColor="var(--border)"
            title="할일 목록"
            tasks={regular}
            onToggle={handleToggle}
            onToggleImportant={handleToggleImportant}
            onEdit={setModal}
            onDelete={handleDelete}
          />
        )}

        {/* ── 완료된 항목 ── */}
        {done.length > 0 && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <button
              type="button"
              onClick={() => setShowCompleted(p => !p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 600,
                fontFamily: 'inherit', padding: 0,
              }}
            >
              <i className={`fas fa-chevron-${showCompleted ? 'down' : 'right'}`}
                style={{ fontSize: '0.65rem', transition: 'transform .2s', width: 12 }} />
              <i className="fas fa-circle-check" style={{ color: 'var(--green)', fontSize: '0.88rem' }} />
              완료된 항목 ({done.length}개)
            </button>

            {showCompleted && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {done.map(t => (
                  <PlannerItem
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    onToggleImportant={handleToggleImportant}
                    onEdit={setModal}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <TaskModal
          task={'_date' in modal ? null : modal}
          defaultDate={date}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadTasks(); }}
        />
      )}
    </div>
  );
}

/* ── TaskSection ── */
function TaskSection({ icon, iconColor, bgColor, borderColor, title, tasks, onToggle, onToggleImportant, onEdit, onDelete }) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <i className={`fas ${icon}`} style={{ color: iconColor, fontSize: '0.85rem' }} />
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: iconColor,
          background: 'var(--surface)', borderRadius: 999,
          padding: '1px 7px', border: `1px solid ${borderColor}`,
        }}>{tasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {tasks.map(t => (
          <PlannerItem
            key={t.id}
            task={t}
            onToggle={onToggle}
            onToggleImportant={onToggleImportant}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/* ── PlannerItem ── */
function PlannerItem({ task, onToggle, onToggleImportant, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const isImportant = task.priority === 'high';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 10,
        background: hovered ? 'var(--bg)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--border)' : 'transparent'}`,
        transition: 'background .1s, border-color .1s',
        opacity: task.completed ? 0.5 : 1,
      }}
    >
      {/* 완료 체크박스 — 네모 */}
      <button
        onClick={() => onToggle(task.id, task.completed)}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${
            task.completed ? 'var(--green)' :
            isImportant   ? '#d97706'      :
            'var(--border)'}`,
          background: task.completed ? 'var(--green)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.65rem', transition: 'all .15s',
        }}
      >
        {task.completed && <i className="fas fa-check" />}
      </button>

      {/* 제목 + 시간 */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onEdit(task)}>
        <div style={{
          fontSize: '0.9rem', fontWeight: task.completed ? 400 : 500,
          color: 'var(--text)',
          textDecoration: task.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.recurrence && task.recurrence !== 'none' && (
            <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 4, color: 'var(--primary)', opacity: 0.6 }} />
          )}
          {task.title}
        </div>
        {task.due_time && (
          <div style={{ fontSize: '0.73rem', color: 'var(--indigo-600)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fas fa-clock" style={{ fontSize: '0.65rem' }} />
            {task.due_time}
          </div>
        )}
      </div>

      {/* 중요 별 토글 */}
      <button
        onClick={() => onToggleImportant(task)}
        title={isImportant ? '중요 해제' : '중요 표시'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: isImportant ? '#d97706' : hovered ? 'var(--border)' : 'transparent',
          fontSize: '0.88rem', padding: '3px 4px',
          transition: 'color .12s', flexShrink: 0,
        }}
      >
        <i className={`${isImportant ? 'fas' : 'far'} fa-star`} />
      </button>

      {/* 삭제 */}
      <button
        onClick={() => onDelete(task.id)}
        title="삭제"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: hovered ? 'var(--red)' : 'transparent',
          fontSize: '0.78rem', padding: '3px 4px',
          transition: 'color .12s', flexShrink: 0,
        }}
      >
        <i className="fas fa-trash" />
      </button>
    </div>
  );
}
