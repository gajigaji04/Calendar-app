'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
function addDays(ds, n) {
  const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return toDateStr(d);
}
function getWeight(t) { return { high: 3, medium: 2, low: 1 }[t.priority] ?? 1; }

// ─── 서브 컴포넌트 ────────────────────────────────────────

function MemberAvatar({ member, idx, size = 32, showBadge, badgeColor }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: MEMBER_COLORS[idx % MEMBER_COLORS.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.35 + 'rem',
      }}>
        {(member.display_name || member.email || '?')[0].toUpperCase()}
      </div>
      {showBadge && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: '50%',
          background: badgeColor ?? 'var(--green-500)',
          border: '2px solid var(--card)',
        }} />
      )}
    </div>
  );
}

// ─── 리포트 탭 ────────────────────────────────────────────
function ReportTab({ tasks, members, today }) {
  const report = useMemo(() => computeReport(tasks, members, today), [tasks, members, today]);

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 팀 요약 */}
      <div className="card">
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          팀 요약
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: '전체 할일', value: report.total,       icon: 'fa-list-check',     color: 'var(--indigo-400,#818cf8)' },
            { label: '완료',     value: report.completed,    icon: 'fa-circle-check',   color: 'var(--green-500)' },
            { label: '완료율',   value: report.rate + '%',   icon: 'fa-chart-pie',      color: '#f59e0b' },
            { label: '과부하 멤버', value: report.overloaded.length, icon: 'fa-fire', color: 'var(--red-500)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'var(--bg-sub,rgba(0,0,0,0.04))', border: '1px solid var(--border)' }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '1.1rem', marginBottom: 6, display: 'block' }} />
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 멤버별 업무량 */}
      <div className="card">
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          멤버별 업무량
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.memberStats.map((ms) => {
            const maxScore = Math.max(...report.memberStats.map(m => m.score), 1);
            const pct      = Math.round((ms.score / maxScore) * 100);
            const isOver   = ms.score >= 7;
            return (
              <div key={ms.userId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <MemberAvatar member={ms} idx={members.findIndex(m => m.user_id === ms.userId)} size={26} />
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                    {ms.name}
                  </span>
                  {isOver && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      background: 'rgba(239,68,68,0.1)', color: 'var(--red-500)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}>⚡ 과부하</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', minWidth: 60, textAlign: 'right' }}>
                    {ms.done}/{ms.total} 완료
                  </span>
                </div>
                {/* 진행 바 */}
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: pct + '%',
                    background: isOver
                      ? 'linear-gradient(90deg, #ef4444, #f97316)'
                      : `linear-gradient(90deg, ${MEMBER_COLORS[members.findIndex(m => m.user_id === ms.userId) % MEMBER_COLORS.length]}, ${MEMBER_COLORS[members.findIndex(m => m.user_id === ms.userId) % MEMBER_COLORS.length]}aa)`,
                    transition: 'width .4s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted,#9ca3af)' }}>부하 {ms.score}점</span>
                  {ms.overdueCnt > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--red-500)' }}>
                      <i className="fas fa-clock" style={{ marginRight: 3 }} />미완료 {ms.overdueCnt}개
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 일정 충돌 날짜 */}
      {report.conflictDays.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#f59e0b', marginRight: 6 }} />
            일정 집중 날짜 (상위 5일)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.conflictDays.slice(0, 5).map(cd => {
              const d    = new Date(cd.date + 'T00:00:00');
              const wd   = DAYS[d.getDay()];
              const past = cd.date < today;
              return (
                <div key={cd.date} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 8,
                  background: cd.score >= 10 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${cd.score >= 10 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  opacity: past ? 0.55 : 1,
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text)' }}>
                      {d.getMonth() + 1}월 {d.getDate()}일({wd})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginLeft: 8 }}>
                      {cd.memberCount}명 · {cd.taskCount}개 할일
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: -4 }}>
                    {cd.memberIds.slice(0, 4).map(uid => {
                      const mi = members.findIndex(m => m.user_id === uid);
                      return (
                        <div key={uid} style={{
                          width: 22, height: 22, borderRadius: '50%', marginLeft: -6,
                          background: MEMBER_COLORS[mi % MEMBER_COLORS.length],
                          border: '2px solid var(--card)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                        }}>
                          {(members[mi]?.display_name || members[mi]?.email || '?')[0].toUpperCase()}
                        </div>
                      );
                    })}
                    {cd.memberIds.length > 4 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginLeft: 6, alignSelf: 'center' }}>
                        +{cd.memberIds.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 과부하 멤버 */}
      {report.overloaded.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red-500)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i className="fas fa-fire" style={{ marginRight: 6 }} />
            과부하 감지 멤버
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.overloaded.map(ms => {
              const mi = members.findIndex(m => m.user_id === ms.userId);
              return (
                <div key={ms.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
                }}>
                  <MemberAvatar member={ms} idx={mi} size={30} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{ms.name}</span>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-sub)', margin: 0 }}>
                      부하 {ms.score}점 · 미완료 {ms.remaining}개 (높음 {ms.highCount}개)
                    </p>
                  </div>
                  <i className="fas fa-fire" style={{ color: 'var(--red-500)', opacity: 0.7 }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 이번 주 완료율 */}
      <div className="card">
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          이번 주 현황
        </p>
        <WeekProgress tasks={tasks} today={today} />
      </div>

    </div>
  );
}

function WeekProgress({ tasks, today }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {days.map(d => {
        const dayTasks = tasks.filter(t => t.date === d);
        const done     = dayTasks.filter(t => t.completed).length;
        const total    = dayTasks.length;
        const isToday  = d === today;
        const past     = d < today;
        const wd       = DAYS[new Date(d + 'T00:00:00').getDay()];
        const dd       = Number(d.slice(8));
        const pct      = total > 0 ? Math.round((done / total) * 100) : null;
        return (
          <div key={d} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginBottom: 4 }}>{wd}</div>
            <div style={{
              fontSize: '0.75rem', fontWeight: isToday ? 800 : 500,
              color: isToday ? 'var(--indigo-600)' : 'var(--text)',
              marginBottom: 5,
            }}>{dd}</div>
            <div style={{
              height: 36, borderRadius: 6,
              background: 'var(--border)',
              position: 'relative', overflow: 'hidden',
            }}>
              {total > 0 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: pct + '%',
                  background: pct === 100
                    ? 'var(--green-500)'
                    : past ? 'rgba(239,68,68,0.6)' : 'var(--indigo-400,#818cf8)',
                  transition: 'height .3s ease',
                }} />
              )}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginTop: 3 }}>
              {total > 0 ? `${done}/${total}` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 리포트 계산 ──────────────────────────────────────────
function computeReport(tasks, members, today) {
  const futureTasks = tasks.filter(t => t.date >= today && !t.completed);
  const total       = tasks.length;
  const completed   = tasks.filter(t => t.completed).length;
  const rate        = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 멤버별 통계
  const memberStats = members.map(m => {
    const mt         = tasks.filter(t => t.user_id === m.user_id);
    const mFuture    = mt.filter(t => !t.completed && t.date >= today);
    const mOverdue   = mt.filter(t => !t.completed && t.date < today);
    const score      = mFuture.reduce((s, t) => s + getWeight(t), 0);
    const highCount  = mFuture.filter(t => t.priority === 'high').length;
    return {
      userId:     m.user_id,
      name:       m.display_name || m.email?.split('@')[0] || '멤버',
      display_name: m.display_name,
      email:      m.email,
      total:      mt.length,
      done:       mt.filter(t => t.completed).length,
      remaining:  mFuture.length,
      score,
      highCount,
      overdueCnt: mOverdue.length,
    };
  }).sort((a, b) => b.score - a.score);

  // 과부하 멤버 (부하 점수 7 이상)
  const overloaded = memberStats.filter(m => m.score >= 7);

  // 날짜별 집중 분석
  const dateMap = {};
  futureTasks.forEach(t => {
    if (!dateMap[t.date]) dateMap[t.date] = { taskCount: 0, score: 0, memberIds: new Set() };
    dateMap[t.date].taskCount++;
    dateMap[t.date].score += getWeight(t);
    dateMap[t.date].memberIds.add(t.user_id);
  });

  const conflictDays = Object.entries(dateMap)
    .filter(([, v]) => v.memberIds.size >= 2 && v.score >= 5)
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([date, v]) => ({
      date,
      score:       v.score,
      taskCount:   v.taskCount,
      memberCount: v.memberIds.size,
      memberIds:   [...v.memberIds],
    }));

  return { total, completed, rate, memberStats, overloaded, conflictDays };
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function TeamCalendarPage() {
  const { id: teamId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();

  const [team,          setTeam]          = useState(null);
  const [members,       setMembers]       = useState([]);
  const [monthTasks,    setMonthTasks]    = useState([]);  // 현재 월 태스크
  const [reportTasks,   setReportTasks]   = useState([]);  // 넓은 범위 (리포트용)
  const [year,          setYear]          = useState(now.getFullYear());
  const [month,         setMonth]         = useState(now.getMonth());
  const [panel,         setPanel]         = useState(null);
  const [tab,           setTab]           = useState('calendar');
  const [copied,        setCopied]        = useState(false);
  const [filterMembers, setFilterMembers] = useState(new Set()); // 빈 Set = 전체 표시

  const todayStr = toDateStr(now);

  const loadAll = useCallback(async () => {
    if (!user || !teamId) return;
    const [t, m] = await Promise.all([getTeam(teamId), getTeamMembers(teamId)]);
    setTeam(t);
    setMembers(m);
    const memberIds = m.map(x => x.user_id);

    // 월별 캘린더용
    const start = toDateStr(new Date(year, month, 1));
    const end   = toDateStr(new Date(year, month + 1, 0));
    const ts    = await getTasksByUserIds(memberIds, start, end);
    setMonthTasks(ts);

    // 리포트용 (60일 전 ~ 30일 후)
    const rStart = addDays(todayStr, -60);
    const rEnd   = addDays(todayStr, 30);
    const rts    = await getTasksByUserIds(memberIds, rStart, rEnd);
    setReportTasks(rts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, teamId, year, month]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const memberColor = useCallback((uid) => {
    const idx = members.findIndex(m => m.user_id === uid);
    return MEMBER_COLORS[idx % MEMBER_COLORS.length];
  }, [members]);

  const memberName = useCallback((uid) => {
    const m = members.find(m => m.user_id === uid);
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

  function toggleFilter(uid) {
    setFilterMembers(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
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

  // 멤버 필터 적용
  const visibleTasks = filterMembers.size === 0
    ? monthTasks
    : monthTasks.filter(t => filterMembers.has(t.user_id));

  const taskMap = {};
  visibleTasks.forEach(t => {
    if (!taskMap[t.date]) taskMap[t.date] = [];
    taskMap[t.date].push(t);
  });

  // 날짜별 부하 점수 (필터 미적용 전체 기준)
  const loadMap = {};
  monthTasks.forEach(t => {
    loadMap[t.date] = (loadMap[t.date] ?? 0) + getWeight(t);
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

  const panelTasks = panel
    ? (filterMembers.size === 0 ? monthTasks : visibleTasks).filter(t => t.date === panel)
    : [];

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
            {[['calendar','캘린더'],['report','리포트'],['members','멤버']].map(([key,label]) => (
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

      {/* ─── 캘린더 탭 ─── */}
      {tab === 'calendar' && (
        <>
          {/* 멤버 필터 */}
          <div style={{ padding: '0 20px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginRight: 2 }}>필터:</span>
            {members.map((m, i) => {
              const active = filterMembers.size === 0 || filterMembers.has(m.user_id);
              return (
                <button
                  key={m.user_id}
                  onClick={() => toggleFilter(m.user_id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px 3px 6px', borderRadius: 999, cursor: 'pointer',
                    border: `1.5px solid ${active ? MEMBER_COLORS[i % MEMBER_COLORS.length] : 'var(--border)'}`,
                    background: active ? MEMBER_COLORS[i % MEMBER_COLORS.length] + '18' : 'transparent',
                    fontSize: '0.75rem', color: active ? 'var(--text)' : 'var(--text-sub)',
                    fontWeight: active ? 600 : 400, transition: 'all .12s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }} />
                  {m.display_name || m.email?.split('@')[0]}
                  {m.user_id === user.id && <span style={{ opacity: 0.6 }}>(나)</span>}
                </button>
              );
            })}
            {filterMembers.size > 0 && (
              <button
                onClick={() => setFilterMembers(new Set())}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-sub)', fontFamily: 'inherit', padding: '2px 6px' }}
              >
                전체 보기
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0 20px 20px' }}>
            {/* 캘린더 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-chevron-left" /></button>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
                  {year}년 {MONTHS[month]}
                </span>
                <button className="icon-btn" onClick={() => navigate(1)}><i className="fas fa-chevron-right" /></button>
                <button className="btn-secondary btn-sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}>오늘</button>
              </div>

              <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto' }}>
                <div className="full-grid">
                  {DAYS.map(d => <div key={d} className="cal-hdr-cell">{d}</div>)}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="full-grid">
                    {week.map((cell, ci) => {
                      const cellTasks = cell.ds ? (taskMap[cell.ds] || []) : [];
                      const loadScore = cell.ds ? (loadMap[cell.ds] ?? 0) : 0;
                      const isToday   = cell.ds === todayStr;
                      const isOverload = loadScore >= 7;
                      const isHighLoad = loadScore >= 4 && loadScore < 7;
                      const isSun     = ci === 0;
                      const isSat     = ci === 6;
                      return (
                        <div
                          key={wi * 7 + ci}
                          className={['full-cell', cell.other ? 'other-month' : '', isToday ? 'today' : ''].filter(Boolean).join(' ')}
                          onClick={() => cell.ds && setPanel(p => p === cell.ds ? null : cell.ds)}
                          style={{
                            ...(panel === cell.ds ? { background: 'var(--primary-lt)' } : {}),
                            ...(isOverload && !cell.other ? { borderBottom: '3px solid var(--red-500)' } : {}),
                            ...(isHighLoad && !cell.other ? { borderBottom: '3px solid #f59e0b' } : {}),
                          }}
                        >
                          <div className="cell-head-row">
                            <span className={`cell-num${isSun || (cell.ds && KO_HOLIDAYS[cell.ds]) ? ' holiday-num' : isSat ? ' saturday-num' : ''}`}>
                              {cell.d}
                            </span>
                            {/* 부하 인디케이터 */}
                            {!cell.other && loadScore > 0 && (
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700, padding: '0px 5px', borderRadius: 999,
                                background: isOverload ? 'rgba(239,68,68,0.12)' : isHighLoad ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)',
                                color: isOverload ? 'var(--red-500)' : isHighLoad ? '#f59e0b' : 'var(--indigo-400)',
                                marginLeft: 'auto',
                              }}>
                                {loadScore}
                              </span>
                            )}
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
                    {t.priority === 'high' && !t.completed && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--red-500)', marginTop: 2 }}>
                        <i className="fas fa-fire" style={{ marginRight: 3 }} />높은 우선순위
                      </div>
                    )}
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
        </>
      )}

      {/* ─── 리포트 탭 ─── */}
      {tab === 'report' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ReportTab tasks={reportTasks} members={members} today={todayStr} />
        </div>
      )}

      {/* ─── 멤버 탭 ─── */}
      {tab === 'members' && (
        <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>
          {/* 초대 코드 */}
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
            {members.map((m, i) => {
              const memberStat = computeReport(reportTasks, members, todayStr).memberStats
                .find(s => s.userId === m.user_id);
              const isOver = (memberStat?.score ?? 0) >= 7;
              return (
                <div key={m.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <MemberAvatar member={m} idx={i} size={36} showBadge={isOver} badgeColor="var(--red-500)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.display_name || m.email?.split('@')[0]}
                      {m.user_id === user.id && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-sub)' }}>(나)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{m.email}</div>
                    {memberStat && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 2 }}>
                        완료 {memberStat.done}/{memberStat.total} · 부하 {memberStat.score}점
                        {isOver && <span style={{ color: 'var(--red-500)', marginLeft: 6 }}>⚡ 과부하</span>}
                      </div>
                    )}
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
              );
            })}
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
