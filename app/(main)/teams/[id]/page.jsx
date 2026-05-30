'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getTeam, getTeamMembers, removeMember, leaveTeam, regenerateInviteCode } from '@/models/teamModel';
import { getTasksByUserIds } from '@/models/taskModel';
import { getTeamTasks, createTeamTask, toggleTeamTask, deleteTeamTask } from '@/models/teamTaskModel';

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
        color: '#fff', fontWeight: 700, fontSize: size * 0.42 + 'px',
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
  const [monthTasks,    setMonthTasks]    = useState([]);
  const [reportTasks,   setReportTasks]   = useState([]);
  const [yearTasks,     setYearTasks]     = useState([]);
  const [year,          setYear]          = useState(now.getFullYear());
  const [month,         setMonth]         = useState(now.getMonth());
  const [calView,       setCalView]       = useState('month'); // year|month|week
  const [navYear,       setNavYear]       = useState(now.getFullYear());
  const [weekStr,       setWeekStr]       = useState(() => {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return toDateStr(d);
  });
  const [panel,         setPanel]         = useState(null);
  const [tab,           setTab]           = useState('calendar');
  const [copied,        setCopied]        = useState(false);
  const [filterMembers, setFilterMembers] = useState(new Set());

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

  // 연간 데이터 로드
  const loadYear = useCallback(async (yr) => {
    if (!members.length) return;
    const ids = members.map(m => m.user_id);
    const ts = await getTasksByUserIds(ids, `${yr}-01-01`, `${yr}-12-31`);
    setYearTasks(ts);
  }, [members]);

  useEffect(() => {
    if (calView === 'year' && members.length) loadYear(navYear);
  }, [calView, navYear, loadYear]);

  function navigate(dir) {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  }

  function navigateWeekCal(dir) {
    const d = new Date(weekStr + 'T00:00:00');
    d.setDate(d.getDate() + dir * 7);
    setWeekStr(toDateStr(d));
    // 주가 바뀌면 해당 월 데이터 보장 (loadAll이 year/month를 의존)
    setYear(d.getFullYear()); setMonth(d.getMonth());
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

  /* ── 주간 뷰 사전 계산 ── */
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStr + 'T00:00:00'); d.setDate(d.getDate() + i); return toDateStr(d);
  });
  const visWeek  = filterMembers.size === 0 ? monthTasks : monthTasks.filter(t => filterMembers.has(t.user_id));
  const wTaskMap = {};
  visWeek.forEach(t => { (wTaskMap[t.date] = wTaskMap[t.date] ?? []).push(t); });
  const wS = new Date(weekStr + 'T00:00:00');
  const wE = new Date((weekDays[6] ?? weekStr) + 'T00:00:00');
  const weekRangeLabel = wS.getMonth() === wE.getMonth()
    ? `${wS.getFullYear()}년 ${wS.getMonth()+1}월 ${wS.getDate()}일 – ${wE.getDate()}일`
    : `${wS.getMonth()+1}/${wS.getDate()} – ${wE.getMonth()+1}/${wE.getDate()}`;

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
            {[['calendar','캘린더'],['planner','플래너'],['report','리포트'],['members','멤버']].map(([key,label]) => (
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

          {/* ── 뷰 스위처 ── */}
          <div style={{ padding: '0 20px 8px', display: 'flex', gap: 2 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {[['year','연간','fa-calendar'],['month','월간','fa-table-cells'],['week','주간','fa-calendar-week']].map(([v,label,icon]) => (
                <button key={v} onClick={() => { setCalView(v); setPanel(null); }} style={{
                  padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer',
                  border: 'none', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                  background: calView === v ? 'var(--indigo-600,#4f46e5)' : 'var(--surface)',
                  color: calView === v ? '#fff' : 'var(--text-sub)',
                }}>
                  <i className={`fas ${icon}`} style={{ fontSize: '0.7rem' }} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 연간 뷰 ── */}
          {calView === 'year' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button className="icon-btn" onClick={() => setNavYear(p => p - 1)}><i className="fas fa-chevron-left" /></button>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', minWidth: 70, textAlign: 'center' }}>{navYear}년</span>
                <button className="icon-btn" onClick={() => setNavYear(p => p + 1)}><i className="fas fa-chevron-right" /></button>
                <button className="btn-secondary btn-sm" onClick={() => setNavYear(now.getFullYear())}>올해</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {Array.from({ length: 12 }, (_, mi) => {
                  const isNow   = navYear === now.getFullYear() && mi === now.getMonth();
                  const mStr    = `${navYear}-${String(mi+1).padStart(2,'0')}`;
                  const mDays   = new Date(navYear, mi+1, 0).getDate();
                  const mFirst  = new Date(navYear, mi, 1).getDay();
                  const taskSet = new Set((filterMembers.size === 0 ? yearTasks : yearTasks.filter(t => filterMembers.has(t.user_id))).filter(t => t.date.startsWith(mStr)).map(t => t.date));
                  return (
                    <div key={mi}
                      onClick={() => { setYear(navYear); setMonth(mi); setCalView('month'); }}
                      style={{
                        padding: '10px', borderRadius: 10, cursor: 'pointer',
                        background: isNow ? 'rgba(99,102,241,0.07)' : 'var(--card)',
                        border: `1px solid ${isNow ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                        transition: 'border-color .12s',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isNow ? 'var(--indigo-600,#4f46e5)' : 'var(--text)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{mi+1}월</span>
                        {taskSet.size > 0 && <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-sub)' }}>{taskSet.size}일</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                        {['일','월','화','수','목','금','토'].map(w => (
                          <div key={w} style={{ fontSize: '0.5rem', textAlign: 'center', color: 'var(--text-muted,#9ca3af)', fontWeight: 600 }}>{w}</div>
                        ))}
                        {Array.from({ length: mFirst }, (_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: mDays }, (_, d) => {
                          const ds      = `${mStr}-${String(d+1).padStart(2,'0')}`;
                          const hasTask = taskSet.has(ds);
                          const isTd    = ds === todayStr;
                          return (
                            <div key={d} style={{
                              aspectRatio: '1', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.55rem', fontWeight: isTd ? 800 : 400,
                              background: isTd ? '#4f46e5' : hasTask ? 'rgba(99,102,241,0.18)' : 'transparent',
                              color: isTd ? '#fff' : hasTask ? 'var(--indigo-600,#4f46e5)' : 'var(--text-sub)',
                            }}>{d+1}</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 주간 뷰 ── */}
          {calView === 'week' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 20px', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <button className="icon-btn" onClick={() => navigateWeekCal(-1)}><i className="fas fa-chevron-left" /></button>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', minWidth: 200, textAlign: 'center' }}>{weekRangeLabel}</span>
                <button className="icon-btn" onClick={() => navigateWeekCal(1)}><i className="fas fa-chevron-right" /></button>
                <button className="btn-secondary btn-sm" onClick={() => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); setWeekStr(toDateStr(d)); setYear(now.getFullYear()); setMonth(now.getMonth()); }}>
                  이번 주
                </button>
              </div>
              <div className="card" style={{ flex: 1, minHeight: 0, padding: 0, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {weekDays.map((ds, ci) => {
                  const d      = new Date(ds + 'T00:00:00');
                  const isTd   = ds === todayStr;
                  const isPast = ds < todayStr;
                  const dayT   = wTaskMap[ds] ?? [];
                  return (
                    <div key={ds} style={{ borderRight: ci < 6 ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: isTd ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                        <div style={{ fontSize: '0.68rem', color: ci === 0 ? 'var(--red-500)' : ci === 6 ? '#818cf8' : 'var(--text-sub)', fontWeight: 600 }}>{DAYS[ci]}</div>
                        <div style={{ fontSize: '1rem', fontWeight: isTd ? 800 : 600, margin: '2px auto', width: 28, height: 28, borderRadius: '50%', lineHeight: '28px', background: isTd ? '#4f46e5' : 'transparent', color: isTd ? '#fff' : isPast ? 'var(--text-muted,#9ca3af)' : 'var(--text)' }}>
                          {d.getDate()}
                        </div>
                        {dayT.length > 0 && <div style={{ fontSize: '0.62rem', color: 'var(--indigo-400,#818cf8)', fontWeight: 700 }}>{dayT.length}</div>}
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 3px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {dayT.map(t => (
                          <div key={t.id} style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: 4, borderLeft: `3px solid ${memberColor(t.user_id)}`, background: memberColor(t.user_id) + '18', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.5 : 1 }} title={`${memberName(t.user_id)}: ${t.title}`}>
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 월간 뷰 ── */}
          {calView === 'month' && <div style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0 20px 20px' }}>
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
          </div>}
        </>
      )}

      {/* ─── 플래너 탭 ─── */}
      {tab === 'planner' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PlannerTab teamId={teamId} members={members} user={user} />
        </div>
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

// ─── 팀 플래너 탭 ────────────────────────────────────────
const PRIORITY_COLOR = { high: 'var(--red-500,#ef4444)', medium: 'var(--amber-500,#f59e0b)', low: 'var(--green-500,#22c55e)' };
const PRIORITY_KO    = { high: '높음', medium: '보통', low: '낮음' };
const WD = ['일','월','화','수','목','금','토'];

function dsAdd(ds, n) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function getWeekStart(ds) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function PlannerTab({ teamId, members, user }) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];

  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [filter,   setFilter]   = useState('all');      // all | mine | done
  const [viewMode, setViewMode] = useState('list');     // list | month | week
  const [showForm, setShowForm] = useState(false);
  const [err,      setErr]      = useState('');

  // 캘린더 탐색
  const [calYear,   setCalYear]   = useState(now.getFullYear());
  const [calMonth,  setCalMonth]  = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [selected,  setSelected]  = useState(null); // 선택된 날짜 (팝업)

  // 추가 폼
  const [title,      setTitle]      = useState('');
  const [date,       setDate]       = useState(today);
  const [priority,   setPriority]   = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');

  const isOwner = members.find(m => m.user_id === user?.id)?.role === 'owner';

  async function load() {
    setLoading(true);
    try { setTasks(await getTeamTasks(teamId)); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [teamId]); // eslint-disable-line

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setErr('');
    try {
      await createTeamTask({
        team_id:     teamId,
        title:       title.trim(),
        date,
        priority,
        assigned_to: assignedTo || null,
        created_by:  user.id,
      });
      setTitle(''); setDate(today); setPriority('medium'); setAssignedTo('');
      setShowForm(false);
      load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(task) {
    await toggleTeamTask(task.id, task.completed);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  }

  async function handleDelete(id) {
    if (!confirm('이 할 일을 삭제하시겠습니까?')) return;
    await deleteTeamTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const memberMap = Object.fromEntries(members.map((m, i) => [m.user_id, { name: m.display_name || m.email?.split('@')[0], colorIdx: i }]));

  const filtered = tasks.filter(t => {
    if (filter === 'mine') return t.assigned_to === user?.id || t.created_by === user?.id;
    if (filter === 'done') return t.completed;
    return true;
  });

  // 날짜별 그룹
  const groups = {};
  filtered.forEach(t => {
    (groups[t.date] = groups[t.date] ?? []).push(t);
  });

  function dateLabel(ds) {
    const diff = Math.round((new Date(ds + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    const d    = new Date(ds + 'T00:00:00');
    const base = `${d.getMonth()+1}월 ${d.getDate()}일(${['일','월','화','수','목','금','토'][d.getDay()]})`;
    if (diff === 0) return `오늘 · ${base}`;
    if (diff === 1) return `내일 · ${base}`;
    if (diff < 0)  return `${base} (지남)`;
    return base;
  }

  // 날짜→태스크 맵 (캘린더 뷰용, 필터 적용)
  const taskMap = {};
  filtered.forEach(t => { (taskMap[t.date] = taskMap[t.date] ?? []).push(t); });

  // ── 연간 뷰 ─────────────────────────────────────────────
  function YearView() {
    const [pNavYear, setPNavYear] = useState(calYear);

    return (
      <div>
        {/* 연도 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button className="icon-btn" onClick={() => setPNavYear(p => p - 1)}><i className="fas fa-chevron-left" /></button>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', minWidth: 70, textAlign: 'center' }}>{pNavYear}년</span>
          <button className="icon-btn" onClick={() => setPNavYear(p => p + 1)}><i className="fas fa-chevron-right" /></button>
          <button className="btn-secondary btn-sm" onClick={() => setPNavYear(new Date().getFullYear())}>올해</button>
        </div>

        {/* 12개 미니 월 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {Array.from({ length: 12 }, (_, mi) => {
            const isNow  = pNavYear === new Date().getFullYear() && mi === new Date().getMonth();
            const mStr   = `${pNavYear}-${String(mi+1).padStart(2,'0')}`;
            const mDays  = new Date(pNavYear, mi+1, 0).getDate();
            const mFirst = new Date(pNavYear, mi, 1).getDay();
            const taskDs = new Set(filtered.filter(t => t.date.startsWith(mStr)).map(t => t.date));
            return (
              <div key={mi}
                onClick={() => { setCalYear(pNavYear); setCalMonth(mi); setViewMode('month'); }}
                style={{
                  padding: '10px', borderRadius: 10, cursor: 'pointer',
                  background: isNow ? 'rgba(99,102,241,0.07)' : 'var(--card)',
                  border: `1px solid ${isNow ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                  transition: 'border-color .12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isNow ? 'var(--indigo-600,#4f46e5)' : 'var(--text)' }}>{mi+1}월</span>
                  {taskDs.size > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>{taskDs.size}일</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                  {['일','월','화','수','목','금','토'].map(w => (
                    <div key={w} style={{ fontSize: '0.5rem', textAlign: 'center', color: 'var(--text-muted,#9ca3af)', fontWeight: 600 }}>{w}</div>
                  ))}
                  {Array.from({ length: mFirst }, (_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: mDays }, (_, d) => {
                    const ds     = `${mStr}-${String(d+1).padStart(2,'0')}`;
                    const hasTsk = taskDs.has(ds);
                    const isTd   = ds === today;
                    return (
                      <div key={d} style={{
                        aspectRatio: '1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.55rem', fontWeight: isTd ? 800 : 400,
                        background: isTd ? '#4f46e5' : hasTsk ? 'rgba(99,102,241,0.18)' : 'transparent',
                        color: isTd ? '#fff' : hasTsk ? 'var(--indigo-600,#4f46e5)' : 'var(--text-sub)',
                      }}>{d+1}</div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 월간 뷰 ─────────────────────────────────────────────
  function navigateMonth(dir) {
    let m = calMonth + dir, y = calYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setCalMonth(m); setCalYear(y); setSelected(null);
  }

  function MonthView() {
    const first   = new Date(calYear, calMonth, 1).getDay();
    const days    = new Date(calYear, calMonth + 1, 0).getDate();
    const prev    = new Date(calYear, calMonth, 0).getDate();
    const cells   = [];
    for (let i = 0; i < first; i++)
      cells.push({ d: prev - first + 1 + i, ds: null, other: true });
    for (let d = 1; d <= days; d++) {
      const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push({ d, ds, other: false });
    }
    const rem = (7 - cells.length % 7) % 7;
    for (let d = 1; d <= rem; d++) cells.push({ d, ds: null, other: true });
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return (
      <div>
        {/* 월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => navigateMonth(-1)}><i className="fas fa-chevron-left" /></button>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', minWidth: 110, textAlign: 'center' }}>
            {calYear}년 {calMonth + 1}월
          </span>
          <button className="icon-btn" onClick={() => navigateMonth(1)}><i className="fas fa-chevron-right" /></button>
          <button className="btn-secondary btn-sm" onClick={() => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); }}>
            오늘
          </button>
        </div>
        {/* 그리드 */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {WD.map(w => (
              <div key={w} className="cal-hdr-cell">{w}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {week.map((cell, ci) => {
                const cellTasks = cell.ds ? (taskMap[cell.ds] ?? []) : [];
                const isToday   = cell.ds === today;
                const isSel     = cell.ds && selected === cell.ds;
                return (
                  <div
                    key={ci}
                    className={['full-cell', cell.other ? 'other-month' : '', isToday ? 'today' : ''].filter(Boolean).join(' ')}
                    onClick={() => cell.ds && setSelected(s => s === cell.ds ? null : cell.ds)}
                    style={isSel ? { background: 'var(--primary-lt)' } : undefined}
                  >
                    <div className="cell-head-row">
                      <span className={`cell-num${ci === 0 ? ' holiday-num' : ci === 6 ? ' saturday-num' : ''}`}>
                        {cell.d}
                      </span>
                      {cellTasks.length > 0 && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '0 5px', borderRadius: 999,
                          background: 'rgba(99,102,241,0.12)', color: 'var(--indigo-400,#818cf8)',
                          marginLeft: 'auto',
                        }}>
                          {cellTasks.length}
                        </span>
                      )}
                    </div>
                    <div className="cell-tasks">
                      {cellTasks.slice(0, 2).map(t => (
                        <div key={t.id} className={`cell-task ${t.priority}${t.completed ? ' done' : ''}`}
                          style={{ borderLeft: `3px solid ${PRIORITY_COLOR[t.priority]}` }}>
                          {t.title}
                        </div>
                      ))}
                      {cellTasks.length > 2 && <div className="more-label">+{cellTasks.length - 2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* 선택 날짜 상세 */}
        {selected && taskMap[selected] && (
          <DayDetail ds={selected} tasks={taskMap[selected]} onClose={() => setSelected(null)} />
        )}
      </div>
    );
  }

  // ── 주간 뷰 ─────────────────────────────────────────────
  function navigateWeek(dir) {
    setWeekStart(dsAdd(weekStart, dir * 7));
    setSelected(null);
  }

  function WeekView() {
    const days = Array.from({ length: 7 }, (_, i) => dsAdd(weekStart, i));
    const endStr = days[6];
    const s = new Date(weekStart + 'T00:00:00');
    const e = new Date(endStr + 'T00:00:00');
    const rangeLabel = s.getMonth() === e.getMonth()
      ? `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getDate()}일`
      : `${s.getMonth()+1}/${s.getDate()} – ${e.getMonth()+1}/${e.getDate()}`;

    return (
      <div>
        {/* 주 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button className="icon-btn" onClick={() => navigateWeek(-1)}><i className="fas fa-chevron-left" /></button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', minWidth: 210, textAlign: 'center' }}>
            {rangeLabel}
          </span>
          <button className="icon-btn" onClick={() => navigateWeek(1)}><i className="fas fa-chevron-right" /></button>
          <button className="btn-secondary btn-sm" onClick={() => setWeekStart(getWeekStart(today))}>
            이번 주
          </button>
        </div>
        {/* 7열 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {days.map(ds => {
            const d        = new Date(ds + 'T00:00:00');
            const wd       = WD[d.getDay()];
            const dd       = d.getDate();
            const isToday  = ds === today;
            const isPast   = ds < today;
            const dayTasks = taskMap[ds] ?? [];
            const isSel    = selected === ds;
            return (
              <div
                key={ds}
                onClick={() => setSelected(s => s === ds ? null : ds)}
                style={{
                  borderRadius: 10, padding: '8px 8px 6px', cursor: 'pointer',
                  border: `1.5px solid ${isSel ? 'var(--indigo-600,#4f46e5)' : isToday ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                  background: isSel ? 'var(--primary-lt)' : isToday ? 'rgba(99,102,241,0.04)' : 'var(--card)',
                  minHeight: 100, transition: 'border-color .12s',
                }}
              >
                {/* 요일/날짜 */}
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: d.getDay() === 0 ? 'var(--red-500)' : d.getDay() === 6 ? '#818cf8' : 'var(--text-sub)', fontWeight: 600 }}>
                    {wd}
                  </div>
                  <div style={{
                    fontSize: '1rem', fontWeight: isToday ? 800 : 600,
                    color: isToday ? 'var(--indigo-600,#4f46e5)' : isPast ? 'var(--text-muted,#9ca3af)' : 'var(--text)',
                    width: 28, height: 28, borderRadius: '50%', lineHeight: '28px', textAlign: 'center', margin: '0 auto',
                    background: isToday ? 'rgba(99,102,241,0.15)' : 'transparent',
                  }}>
                    {dd}
                  </div>
                </div>
                {/* 태스크 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} style={{
                      fontSize: '0.7rem', padding: '2px 5px', borderRadius: 4,
                      background: PRIORITY_COLOR[t.priority] + '18',
                      borderLeft: `2px solid ${PRIORITY_COLOR[t.priority]}`,
                      color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.5 : 1,
                    }}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted,#9ca3af)', textAlign: 'center' }}>
                      +{dayTasks.length - 3}
                    </div>
                  )}
                  {dayTasks.length === 0 && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted,#9ca3af)', textAlign: 'center', paddingTop: 4, opacity: 0.5 }}>
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* 선택 날짜 상세 */}
        {selected && (
          <DayDetail ds={selected} tasks={taskMap[selected] ?? []} onClose={() => setSelected(null)} />
        )}
      </div>
    );
  }

  // ── 날짜 상세 패널 ──────────────────────────────────────
  function DayDetail({ ds, tasks: dayTasks, onClose }) {
    const d  = new Date(ds + 'T00:00:00');
    const label = `${d.getMonth()+1}월 ${d.getDate()}일(${WD[d.getDay()]})`;
    return (
      <div style={{
        marginTop: 12, padding: '12px 16px', borderRadius: 12,
        background: 'var(--card)', border: '1px solid rgba(99,102,241,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{label}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={() => { setDate(ds); setShowForm(true); setSelected(null); }}
            >
              <i className="fas fa-plus" style={{ marginRight: 5 }} />추가
            </button>
            <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
          </div>
        </div>
        {dayTasks.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', margin: 0 }}>이날 할 일이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dayTasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </div>
    );
  }

  // ── 공통 태스크 행 ──────────────────────────────────────
  function TaskRow({ task }) {
    const assignee = task.assigned_to ? memberMap[task.assigned_to] : null;
    const canDel   = task.created_by === user?.id || isOwner;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 12px', borderRadius: 9,
        background: 'var(--surface)', border: '1px solid var(--border)',
        opacity: task.completed ? 0.55 : 1,
      }}>
        <button onClick={() => handleToggle(task)} style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${task.completed ? '#4f46e5' : 'var(--border)'}`,
          background: task.completed ? '#4f46e5' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {task.completed && <i className="fas fa-check" style={{ fontSize: '0.5rem', color: '#fff' }} />}
        </button>
        <span style={{ flex: 1, fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999, color: PRIORITY_COLOR[task.priority], background: PRIORITY_COLOR[task.priority] + '18', border: `1px solid ${PRIORITY_COLOR[task.priority]}40`, flexShrink: 0 }}>
          {PRIORITY_KO[task.priority]}
        </span>
        {assignee ? (
          <div title={assignee.name} style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: MEMBER_COLORS[assignee.colorIdx % MEMBER_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '8px' }}>
            {(assignee.name || '?')[0].toUpperCase()}
          </div>
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-user" style={{ fontSize: '6px', color: 'var(--text-muted,#9ca3af)' }} />
          </div>
        )}
        {canDel && (
          <button onClick={() => handleDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--text-muted,#9ca3af)', fontSize: '0.7rem', opacity: 0, transition: 'opacity .12s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--red-500)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = 'var(--text-muted,#9ca3af)'; }}>
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 20px 28px' }}>

      {/* ── 툴바 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        {/* 뷰 전환 */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['list','목록','fa-list'],['week','주간','fa-calendar-week'],['month','월간','fa-calendar'],['year','연간','fa-calendar-days']].map(([k,label,icon]) => (
            <button key={k} onClick={() => { setViewMode(k); setSelected(null); }} style={{
              padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              background: viewMode === k ? 'var(--indigo-600,#4f46e5)' : 'var(--surface)',
              color: viewMode === k ? '#fff' : 'var(--text-sub)',
            }}>
              <i className={`fas ${icon}`} style={{ fontSize: '0.72rem' }} />{label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* 목록 필터 (목록 뷰에서만) */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', gap: 5 }}>
              {[['all','전체'],['mine','내 할일'],['done','완료']].map(([k,label]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)',
                  background: filter === k ? 'var(--indigo-600,#4f46e5)' : 'var(--surface)',
                  color: filter === k ? '#fff' : 'var(--text-sub)',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{label}</button>
              ))}
            </div>
          )}
          <button onClick={() => { setShowForm(p => !p); setSelected(null); }} className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }} />할 일 추가
          </button>
        </div>
      </div>

      {/* ── 추가 폼 ── */}
      {showForm && (
        <form onSubmit={handleAdd} style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 16,
          background: 'var(--card)', border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="팀 할 일 제목 *" required autoFocus className="input-field" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: 4 }}>날짜</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: 4 }}>우선순위</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field">
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: 4 }}>담당자</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="input-field">
                  <option value="">담당자 없음</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email?.split('@')[0]}{m.user_id === user?.id ? ' (나)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {err && <p style={{ fontSize: '0.78rem', color: 'var(--red-500)', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setShowForm(false)}>취소</button>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.82rem' }} disabled={saving}>{saving ? '추가 중…' : '추가'}</button>
            </div>
          </div>
        </form>
      )}

      {/* ── 뷰 렌더 ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-sub)' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.4rem' }} />
        </div>
      ) : viewMode === 'year' ? (
        <YearView />
      ) : viewMode === 'month' ? (
        <MonthView />
      ) : viewMode === 'week' ? (
        <WeekView />
      ) : (
        /* 목록 뷰 */
        Object.keys(groups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-sub)' }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: '2.2rem', opacity: 0.2, display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: '0.88rem', margin: 0 }}>
              {filter !== 'all' ? '해당 조건의 할 일이 없습니다' : '팀 할 일을 추가해보세요!'}
            </p>
          </div>
        ) : (
          Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).map(([ds, items]) => (
            <div key={ds} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ds < today ? 'var(--red-500)' : ds === today ? 'var(--indigo-600,#4f46e5)' : 'var(--text-sub)' }}>
                  {dateLabel(ds)}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted,#9ca3af)' }}>
                  {items.filter(t => t.completed).length}/{items.length} 완료
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(task => <TaskRow key={task.id} task={task} />)}
              </div>
            </div>
          ))
        )
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
