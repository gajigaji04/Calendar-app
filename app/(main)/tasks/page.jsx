'use client';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByUser, getTasksByDateRange, toggleComplete } from '@/models/taskModel';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';
import TaskModal from '@/components/task/TaskModal';
import SmartRescheduleModal from '@/components/schedule/SmartRescheduleModal';
import { downloadICS } from '@/lib/exportICS';

const FILTERS = [
  { key: 'all',     label: '전체' },
  { key: 'today',   label: '오늘' },
  { key: 'pending', label: '미완료' },
  { key: 'done',    label: '완료' },
];

const SORT_OPTIONS = [
  { key: 'date',     label: '날짜순' },
  { key: 'priority', label: '우선순위순' },
  { key: 'deadline', label: '마감일순' },
  { key: 'title',    label: '제목순' },
];

const PRIORITY_LABEL = { high: '높음', medium: '보통', low: '낮음' };
const PRIORITY_COLOR = {
  high:   'var(--red-500)',
  medium: 'var(--amber-500)',
  low:    'var(--green-500)',
};
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDeadlineInfo(task) {
  if (!task.deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const dl = new Date(task.deadline + 'T00:00:00');
  const diff = Math.round((dl - today) / 86400000);
  if (diff < 0)   return { cls: 'dl-overdue', label: `D+${Math.abs(diff)} 마감 초과` };
  if (diff === 0) return { cls: 'dl-today',   label: 'D-Day' };
  if (diff <= 3)  return { cls: 'dl-soon',    label: `D-${diff}` };
  if (diff <= 7)  return { cls: 'dl-near',    label: `D-${diff}` };
  if (diff <= 14) return { cls: 'dl-week',    label: `D-${diff}` };
  return null;
}

/* ── ICS 내보내기 모달 ── */
function ExportModal({ userId, onClose }) {
  const now   = new Date();
  const today = toDateStr(now);
  const [mode,      setMode]      = useState('all');
  const [fromDate,  setFromDate]  = useState(today);
  const [toDate,    setToDate]    = useState(today);
  const [exporting, setExporting] = useState(false);

  const QUICK = [
    { key: 'all',    label: '전체' },
    { key: 'month',  label: '이번 달' },
    { key: 'year',   label: '올해' },
    { key: 'custom', label: '기간 선택' },
  ];

  async function handleExport() {
    setExporting(true);
    try {
      let tasks;
      if (mode === 'all') {
        tasks = await getTasksByUser(userId);
      } else {
        let from, to;
        if (mode === 'month') {
          from = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
          to   = toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if (mode === 'year') {
          from = `${now.getFullYear()}-01-01`;
          to   = `${now.getFullYear()}-12-31`;
        } else {
          from = fromDate; to = toDate;
        }
        tasks = await getTasksByDateRange(userId, from, to);
      }
      if (tasks.length === 0) { alert('내보낼 할일이 없습니다.'); return; }
      const label = mode === 'month' ? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
                  : mode === 'year'  ? `${now.getFullYear()}`
                  : mode === 'custom'? `${fromDate}_${toDate}` : 'all';
      downloadICS(tasks, `tasks_${label}.ics`);
      onClose();
    } finally { setExporting(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            <i className="fas fa-file-export" style={{ marginRight: 8, color: 'var(--primary)' }} />ICS 내보내기
          </h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 16 }}>
          Google 캘린더, Apple 캘린더 등에서 가져올 수 있는 .ics 파일로 내보냅니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {QUICK.map(q => (
            <button key={q.key} type="button" onClick={() => setMode(q.key)} style={{
              padding: '9px 0', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${mode === q.key ? 'var(--indigo-600)' : 'var(--border)'}`,
              background: mode === q.key ? 'var(--primary-lt)' : 'var(--surface)',
              color: mode === q.key ? 'var(--indigo-600)' : 'var(--text)',
              fontSize: '0.85rem', fontWeight: mode === q.key ? 700 : 500,
              fontFamily: 'inherit', transition: 'all .12s',
            }}>{q.label}</button>
          ))}
        </div>
        {mode === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>시작일</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>종료일</label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
          <button type="button" className="btn-primary" onClick={handleExport} disabled={exporting}>
            <i className="fas fa-download" style={{ marginRight: 6 }} />
            {exporting ? '생성 중...' : '다운로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function TasksPage() {
  return <Suspense><TasksPageInner /></Suspense>;
}

function TasksPageInner() {
  const { user } = useAuth();
  const { refresh: refreshAlerts } = useDeadlineAlerts();
  const searchParams = useSearchParams();
  const today = toDateStr(new Date());

  const [allTasks,      setAllTasks]      = useState([]);
  const [filter,        setFilter]        = useState('all');
  const [search,        setSearch]        = useState('');
  const [sort,          setSort]          = useState('date');
  const [modal,         setModal]         = useState(null);
  const [exportOpen,    setExportOpen]    = useState(false);
  const [smartOpen,     setSmartOpen]     = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setAllTasks(await getTasksByUser(user.id));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || allTasks.length === 0) return;
    const target = allTasks.find(t => t.id === openId);
    if (target) setModal(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks]);

  /* 완료 통계 */
  const doneCount  = allTasks.filter(t => t.completed).length;
  const totalCount = allTasks.length;
  const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

  function countFilter(key) {
    if (key === 'today')   return allTasks.filter(t => t.date === today).length;
    if (key === 'pending') return allTasks.filter(t => !t.completed).length;
    if (key === 'done')    return allTasks.filter(t => t.completed).length;
    return allTasks.length;
  }

  const filtered = useMemo(() => {
    let list = allTasks.filter(t => {
      const matchFilter =
        filter === 'today'   ? t.date === today :
        filter === 'pending' ? !t.completed :
        filter === 'done'    ? t.completed : true;
      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'date')     return a.date.localeCompare(b.date);
      if (sort === 'priority') return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      if (sort === 'title')    return a.title.localeCompare(b.title, 'ko');
      if (sort === 'deadline') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      }
      return 0;
    });
    return list;
  }, [allTasks, filter, search, sort, today]);

  const modalRef = useRef(null);
  useEffect(() => { modalRef.current = modal; }, [modal]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (modalRef.current) return;
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setModal('add');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleToggle(id, cur) {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !cur } : t));
    try {
      await toggleComplete(id, cur);
      refreshAlerts();
    } catch {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, completed: cur } : t));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="view-header">
        <div>
          <h2>내 할일</h2>
          <p className="view-sub">할일을 관리하고 완료 상태를 추적하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setExportOpen(true)}>
            <i className="fas fa-file-export" /> 내보내기
          </button>
          <button
            className="btn-secondary"
            onClick={() => setSmartOpen(true)}
            title="과부하 날짜 감지 후 일정 재배치 제안"
            style={{ color: 'var(--indigo-400,#818cf8)' }}
          >
            <i className="fas fa-wand-magic-sparkles" /> 스마트 재배치
          </button>
          <button className="btn-primary" onClick={() => setModal('add')}>
            <i className="fas fa-plus" /> 할일 추가
          </button>
        </div>
      </div>

      {/* 완료율 바 */}
      {totalCount > 0 && (
        <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: pct === 100 ? 'var(--green-500)' : 'var(--indigo-600)',
              width: `${pct}%`, transition: 'width .4s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {doneCount}/{totalCount} 완료 ({pct}%)
          </span>
        </div>
      )}

      {/* 필터 탭 */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>({countFilter(f.key)})</span>
          </button>
        ))}
      </div>

      {/* 검색 + 정렬 툴바 */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 20px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="fas fa-magnifying-glass" style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-sub)', fontSize: '0.78rem', pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="할일 검색..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px',
              border: '1px solid var(--border)', borderRadius: 10,
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-sub)', fontSize: '0.75rem', padding: 2,
              }}
            ><i className="fas fa-times" /></button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 10,
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* 목록 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '4px 20px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', color: 'var(--border)' }} />
            {search ? `"${search}" 검색 결과가 없습니다` : '할일이 없습니다'}
          </div>
        ) : filtered.map((t, i) => {
          const dl = getDeadlineInfo(t);
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                borderLeft: t.color ? `4px solid ${t.color}` : '4px solid transparent',
              }}
            >
              <button
                onClick={() => handleToggle(t.id, t.completed)}
                style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${t.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
                  background: t.completed ? 'var(--indigo-600)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.65rem', transition: 'all .12s',
                }}
              >
                {t.completed && <i className="fas fa-check" />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.92rem', color: 'var(--text)', fontWeight: 500,
                  textDecoration: t.completed ? 'line-through' : 'none',
                  opacity: t.completed ? 0.45 : 1,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {t.recurrence && t.recurrence !== 'none' && (
                    <i className="fas fa-repeat" style={{ fontSize: '0.72rem', marginRight: 5, color: 'var(--primary)', opacity: 0.7 }} />
                  )}
                  {t.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span><i className="fas fa-calendar" style={{ marginRight: 4 }} />{t.date}</span>
                  {t.due_time && (
                    <span style={{ color: 'var(--indigo-600)' }}>
                      <i className="fas fa-clock" style={{ marginRight: 4 }} />{t.due_time}까지
                    </span>
                  )}
                  {t.deadline && (
                    dl
                      ? <span className={`deadline-badge ${dl.cls}`}><i className="fas fa-flag" /> {dl.label}</span>
                      : <span><i className="fas fa-flag" style={{ marginRight: 4 }} />마감 {t.deadline}</span>
                  )}
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: PRIORITY_COLOR[t.priority], fontWeight: 600, flexShrink: 0 }}>
                {PRIORITY_LABEL[t.priority]}
              </span>

              <button className="icon-btn" onClick={() => setModal(t)} style={{ flexShrink: 0 }}>
                <i className="fas fa-ellipsis-v" />
              </button>
            </div>
          );
        })}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'add' ? null : modal}
          defaultDate={today}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {exportOpen && (
        <ExportModal userId={user.id} onClose={() => setExportOpen(false)} />
      )}

      {smartOpen && (
        <SmartRescheduleModal
          tasks={allTasks}
          today={today}
          onClose={() => setSmartOpen(false)}
          onApplied={load}
        />
      )}
    </div>
  );
}
