'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTeam, getTeamMembers, removeMember, leaveTeam, regenerateInviteCode } from '@/models/teamModel';
import { getTasksByUserIds } from '@/models/taskModel';

const DAYS   = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MEMBER_COLORS = ['#6366f1','#ef4444','#22c55e','#f97316','#06b6d4','#a855f7','#ec4899','#f59e0b'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function TeamCalendarPage() {
  const { id: teamId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();

  const [team,    setTeam]    = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [panel,   setPanel]   = useState(null); // selected date string
  const [tab,     setTab]     = useState('calendar'); // 'calendar' | 'members'
  const [copied,  setCopied]  = useState(false);

  const todayStr = toDateStr(now);

  const loadAll = useCallback(async () => {
    if (!user || !teamId) return;
    const [t, m] = await Promise.all([getTeam(teamId), getTeamMembers(teamId)]);
    setTeam(t);
    setMembers(m);
    const start = toDateStr(new Date(year, month, 1));
    const end   = toDateStr(new Date(year, month + 1, 0));
    const memberIds = m.map(x => x.user_id);
    const ts = await getTasksByUserIds(memberIds, start, end);
    setTasks(ts);
  }, [user, teamId, year, month]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const memberColor = useCallback((userId) => {
    const idx = members.findIndex(m => m.user_id === userId);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }, [members]);

  const memberName = useCallback((userId) => {
    const m = members.find(m => m.user_id === userId);
    return m?.display_name || m?.email?.split('@')[0] || '멤버';
  }, [members]);

  function navigate(dir) {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  }

  async function handleCopyCode() {
    if (!team) return;
    await navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegen() {
    if (!confirm('초대 코드를 재발급하면 기존 코드는 사용할 수 없습니다. 계속하시겠습니까?')) return;
    const newCode = await regenerateInviteCode(teamId);
    setTeam(t => ({ ...t, invite_code: newCode }));
  }

  async function handleRemove(member) {
    if (!confirm(`${member.display_name || member.email}님을 팀에서 내보내시겠습니까?`)) return;
    await removeMember(teamId, member.user_id);
    loadAll();
  }

  async function handleLeave() {
    if (!confirm('팀을 탈퇴하시겠습니까?')) return;
    await leaveTeam(teamId, user.id);
    router.push('/teams');
  }

  if (!team) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-sub)' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem' }} />
    </div>
  );

  const isOwner = team.owner_id === user.id;

  /* ── 월 뷰 데이터 ── */
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  const taskMap = {};
  tasks.forEach(t => {
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

  const panelTasks = panel ? (taskMap[panel] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', minHeight: 0 }}>
      {/* 헤더 */}
      <div className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="icon-btn" onClick={() => router.push('/teams')} title="팀 목록">
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {team.name}
              {isOwner && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px',
                borderRadius: 6, background: 'var(--primary-lt)', color: 'var(--primary)' }}>팀장</span>}
            </h2>
            <p className="view-sub">{members.length}명의 멤버</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[['calendar','캘린더'],['members','멤버']].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: '5px 14px', fontSize: '0.82rem', cursor: 'pointer',
                border: 'none', fontFamily: 'inherit',
                background: tab === key ? 'var(--indigo-600)' : 'var(--surface)',
                color: tab === key ? '#fff' : 'var(--text)',
              }}>{label}</button>
            ))}
          </div>
          {!isOwner && (
            <button className="btn-secondary btn-sm" style={{ color: 'var(--red-500)' }} onClick={handleLeave}>
              탈퇴
            </button>
          )}
        </div>
      </div>

      {/* 멤버 컬러 범례 */}
      <div style={{ padding: '0 20px 8px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {members.map((m, i) => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-sub)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: MEMBER_COLORS[i % MEMBER_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
            {m.display_name || m.email?.split('@')[0]}
            {m.user_id === user.id && <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>(나)</span>}
          </div>
        ))}
      </div>

      {tab === 'calendar' ? (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0 20px 20px' }}>
          {/* 캘린더 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* 월 네비게이션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-chevron-left" /></button>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
                {year}년 {MONTHS[month]}
              </span>
              <button className="icon-btn" onClick={() => navigate(1)}><i className="fas fa-chevron-right" /></button>
              <button className="btn-secondary btn-sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>오늘</button>
            </div>

            <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto' }}>
              {/* 요일 헤더 */}
              <div className="full-grid">
                {DAYS.map(d => <div key={d} className="cal-hdr-cell">{d}</div>)}
              </div>

              {/* 날짜 셀 */}
              {weeks.map((week, wi) => (
                <div key={wi} className="full-grid">
                  {week.map((cell, ci) => {
                    const cellTasks = cell.ds ? (taskMap[cell.ds] || []) : [];
                    const isToday   = cell.ds === todayStr;
                    const isSun     = ci === 0;
                    const isSat     = ci === 6;
                    return (
                      <div
                        key={wi * 7 + ci}
                        className={['full-cell', cell.other ? 'other-month' : '', isToday ? 'today' : ''].filter(Boolean).join(' ')}
                        onClick={() => cell.ds && setPanel(p => p === cell.ds ? null : cell.ds)}
                        style={panel === cell.ds ? { background: 'var(--primary-lt)' } : undefined}
                      >
                        <div className="cell-head-row">
                          <span className={`cell-num${isSun || (cell.ds && KO_HOLIDAYS[cell.ds]) ? ' holiday-num' : isSat ? ' saturday-num' : ''}`}>
                            {cell.d}
                          </span>
                        </div>
                        <div className="cell-tasks">
                          {cellTasks.slice(0, 3).map(t => (
                            <div
                              key={t.id}
                              className={`cell-task ${t.priority || 'low'}${t.completed ? ' done' : ''}`}
                              style={{ borderLeft: `3px solid ${memberColor(t.user_id)}` }}
                              title={`${memberName(t.user_id)}: ${t.title}`}
                            >
                              <span style={{
                                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                                background: memberColor(t.user_id), marginRight: 4, flexShrink: 0,
                              }} />
                              {t.title}
                            </div>
                          ))}
                          {cellTasks.length > 3 && <div className="more-label">+{cellTasks.length - 3}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 날짜 패널 */}
          {panel && (
            <div className="card cal-day-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 0 0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{panel}</span>
                <button className="icon-btn" onClick={() => setPanel(null)}><i className="fas fa-times" /></button>
              </div>

              {panelTasks.length === 0 ? (
                <p style={{ color: 'var(--text-sub)', fontSize: '0.83rem', textAlign: 'center', padding: '16px 0' }}>
                  일정이 없습니다
                </p>
              ) : panelTasks.map(t => (
                <div key={t.id} style={{
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)', borderLeft: `3px solid ${memberColor(t.user_id)}`,
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: memberColor(t.user_id), marginBottom: 2 }}>
                    {memberName(t.user_id)}
                    {t.user_id === user.id && <span style={{ fontSize: '0.68rem', marginLeft: 4, opacity: 0.7 }}>(나)</span>}
                  </div>
                  <div style={{
                    fontSize: '0.83rem', color: 'var(--text)',
                    textDecoration: t.completed ? 'line-through' : 'none',
                    opacity: t.completed ? 0.5 : 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.recurrence && t.recurrence !== 'none' && <i className="fas fa-repeat" style={{ fontSize: '0.6rem', marginRight: 4, opacity: 0.6 }} />}
                    {t.title}
                  </div>
                  {t.due_time && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--indigo-600)', marginTop: 2 }}>
                      <i className="fas fa-clock" style={{ marginRight: 3 }} />{t.due_time}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 멤버 탭 */
        <div style={{ padding: '0 20px 20px' }}>
          {/* 초대 코드 카드 */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 8 }}>
              <i className="fas fa-key" style={{ marginRight: 6 }} />초대 코드
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
                fontSize: '1.1rem', fontFamily: 'monospace', letterSpacing: '0.12em',
                color: 'var(--indigo-600)', fontWeight: 700,
              }}>
                {team.invite_code}
              </code>
              <button className="btn-secondary btn-sm" onClick={handleCopyCode}>
                <i className={`fas fa-${copied ? 'check' : 'copy'}`} />
                {copied ? ' 복사됨' : ' 복사'}
              </button>
              {isOwner && (
                <button className="btn-secondary btn-sm" onClick={handleRegen} title="코드 재발급">
                  <i className="fas fa-arrows-rotate" />
                </button>
              )}
            </div>
          </div>

          {/* 멤버 목록 */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {members.map((m, i) => (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 18px',
                borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: MEMBER_COLORS[i % MEMBER_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                }}>
                  {(m.display_name || m.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.display_name || m.email?.split('@')[0]}
                    {m.user_id === user.id && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-sub)' }}>(나)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{m.email}</div>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: m.role === 'owner' ? 'var(--primary-lt)' : 'var(--bg)',
                  color: m.role === 'owner' ? 'var(--primary)' : 'var(--text-sub)',
                }}>
                  {m.role === 'owner' ? '팀장' : '멤버'}
                </span>
                {isOwner && m.user_id !== user.id && (
                  <button className="icon-btn" style={{ color: 'var(--red-500)' }} onClick={() => handleRemove(m)} title="내보내기">
                    <i className="fas fa-user-minus" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const KO_HOLIDAYS = {
  '2025-01-01':'신정','2025-03-01':'삼일절','2025-05-05':'어린이날·부처님오신날',
  '2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절',
  '2025-10-06':'추석','2025-10-09':'한글날','2025-12-25':'성탄절',
  '2026-01-01':'신정','2026-02-17':'설날','2026-03-01':'삼일절',
  '2026-05-05':'어린이날','2026-06-06':'현충일','2026-08-15':'광복절',
  '2026-09-25':'추석','2026-10-03':'개천절','2026-10-09':'한글날','2026-12-25':'성탄절',
};
