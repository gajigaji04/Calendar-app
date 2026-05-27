'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByUser } from '@/models/taskModel';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  return { start, end };
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

/* ──────────────────────────────────────────
   패턴 분석 컴포넌트
────────────────────────────────────────── */

/** 요일별 완료 패턴 카드 */
function WeekdayPatternCard({ data }) {
  const { ordered, bestDay, hourBuckets, bestHour } = data;
  const maxRate = Math.max(...ordered.filter(d => d.total > 0).map(d => d.done / d.total * 100), 1);
  const todayDow = new Date().getDay(); // 0=Sun
  // reorder index: ordered = [월(1), 화(2), ..., 일(0)]
  const orderedDow = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <i className="fas fa-clock" style={{ color: 'var(--primary)', marginRight: 8 }} />
        집중 패턴 분석
      </div>

      {/* 최고 요일 배너 */}
      {bestDay ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 }}>
          <span style={{ fontSize: '1.4rem' }}>🏆</span>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              {bestDay.label}요일이 가장 생산적!
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-sub)' }}>
              완료율 {Math.round(bestDay.done / bestDay.total * 100)}% · {bestDay.total}개 중 {bestDay.done}개 완료
            </p>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: 16 }}>데이터가 쌓이면 패턴을 분석해 드립니다.</p>
      )}

      {/* 요일별 바 차트 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 90, marginBottom: 12 }}>
        {ordered.map((d, idx) => {
          const rate = d.total > 0 ? d.done / d.total * 100 : 0;
          const barH = d.total > 0 ? Math.max(6, (rate / maxRate) * 70) : 4;
          const isToday = orderedDow[idx] === todayDow;
          const isBest  = bestDay && bestDay.day === d.day;
          return (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {d.total > 0 && (
                <span style={{ fontSize: '0.62rem', color: isBest ? 'var(--green-500)' : 'var(--text-sub)', fontWeight: 700 }}>
                  {Math.round(rate)}%
                </span>
              )}
              <div style={{ width: '100%', background: 'var(--border)', borderRadius: 4, height: barH, marginTop: 'auto',
                background: isBest ? 'var(--green-500)' : isToday ? 'var(--primary)' : 'var(--border)',
                transition: 'height .5s ease', opacity: d.total === 0 ? 0.4 : 1,
              }} />
              <span style={{ fontSize: '0.7rem', color: isToday ? 'var(--primary)' : 'var(--text-sub)', fontWeight: isToday ? 700 : 500 }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 시간대 패턴 */}
      {bestHour && bestHour.count > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {hourBuckets.map(b => (
            <div key={b.short} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
              background: b === bestHour ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${b === bestHour ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              color: b === bestHour ? 'var(--primary)' : 'var(--text-sub)',
            }}>
              {b.short} {b.count > 0 ? `${b.count}건` : ''}
              {b === bestHour && ' ⭐'}
            </div>
          ))}
          <p style={{ width: '100%', fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 4 }}>
            💡 <b>{bestHour.short}</b> 시간대에 완료 처리를 가장 많이 해요
          </p>
        </div>
      )}
    </div>
  );
}

/** 미루기 감지 카드 */
function ProcrastinationCard({ data }) {
  const { score, overdue, mild, moderate, severe, topOverdue } = data;
  const level =
    score < 10 ? { label: '매우 양호', color: 'var(--green-500)',  emoji: '😄' } :
    score < 25 ? { label: '양호',      color: 'var(--green-500)',  emoji: '😊' } :
    score < 50 ? { label: '주의',      color: 'var(--amber-500)', emoji: '🤔' } :
    score < 70 ? { label: '경고',      color: '#f97316',          emoji: '😰' } :
               { label: '위험',      color: 'var(--red-500)',   emoji: '🚨' };

  const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
  function fmtDate(ds) {
    const d = new Date(ds + 'T00:00:00');
    return `${d.getMonth()+1}/${d.getDate()}(${DAYS_KO[d.getDay()]})`;
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <i className="fas fa-person-running" style={{ color: 'var(--primary)', marginRight: 8 }} />
        미루기 감지
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
        {/* 원형 게이지 */}
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={level.color} strokeWidth="3"
              strokeDasharray={`${score} 100`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .8s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: level.color }}>{score}</span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-sub)' }}>점</span>
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
            {level.emoji} 미루기 지수: <span style={{ color: level.color }}>{level.label}</span>
          </p>
          {overdue > 0 ? (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-sub)' }}>
              미완료 일정 중 <b style={{ color: level.color }}>{score}%</b>가 예정일 초과
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--green-500)' }}>
              기한 초과 일정 없음 🎉
            </p>
          )}

          {overdue > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { label: '경미(1-3일)', count: mild,     color: 'var(--amber-500)' },
                { label: '중간(4-7일)', count: moderate, color: '#f97316' },
                { label: '심각(7일+)',  count: severe,   color: 'var(--red-500)' },
              ].map(s => s.count > 0 && (
                <span key={s.label} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                  background: s.color + '18', color: s.color, border: `1px solid ${s.color}40`, fontWeight: 600 }}>
                  {s.label}: {s.count}개
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 상위 미루기 목록 */}
      {topOverdue.length > 0 && (
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            기한 초과 일정 (오래된 순)
          </p>
          {topOverdue.map(t => {
            const today = todayStr();
            const days = daysBetween(t.date, today);
            const c = days > 7 ? 'var(--red-500)' : days > 3 ? '#f97316' : 'var(--amber-500)';
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: c, whiteSpace: 'nowrap', background: c + '15', padding: '2px 7px', borderRadius: 999 }}>
                  +{days}일
                </span>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', flexShrink: 0 }}>
                  {fmtDate(t.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 실행률 트렌드 카드 */
function TrendCard({ data }) {
  function TrendItem({ current, prev, label, sub }) {
    if (current === null) return (
      <div style={{ flex: 1, padding: '16px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>데이터 없음</div>
      </div>
    );
    const diff = prev !== null ? current - prev : null;
    const up   = diff !== null && diff > 0;
    const dn   = diff !== null && diff < 0;
    const trendColor = up ? 'var(--green-500)' : dn ? 'var(--red-500)' : 'var(--text-sub)';
    const trendIcon  = up ? 'fa-arrow-trend-up' : dn ? 'fa-arrow-trend-down' : 'fa-minus';
    const rateColor  = current >= 70 ? 'var(--green-500)' : current >= 40 ? 'var(--amber-500)' : 'var(--red-500)';

    return (
      <div style={{ flex: 1, padding: '16px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: rateColor, lineHeight: 1 }}>{current}%</div>
        {diff !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <i className={`fas ${trendIcon}`} style={{ fontSize: '0.7rem', color: trendColor }} />
            <span style={{ fontSize: '0.75rem', color: trendColor, fontWeight: 700 }}>
              {diff > 0 ? '+' : ''}{diff}%p
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>전 기간 대비</span>
          </div>
        )}
        {prev !== null && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 3 }}>이전: {prev}%</div>
        )}
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <i className="fas fa-arrow-trend-up" style={{ color: 'var(--primary)', marginRight: 8 }} />
        실행률 트렌드
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TrendItem {...data.week} />
        <TrendItem {...data.month} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 120, padding: '16px 18px' }}>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: color || 'var(--primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PriorityBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-sub)' }}>{count}개 ({pct}%)</span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  );
}

function WeeklyBarChart({ weeks }) {
  const maxVal = Math.max(...weeks.map(w => w.total), 1);
  const BAR_W = 28;
  const CHART_H = 110;
  const W = 400;
  const gap = (W - weeks.length * BAR_W) / (weeks.length + 1);

  return (
    <svg viewBox={`0 0 ${W} ${CHART_H + 28}`} style={{ width: '100%' }}>
      {weeks.map((w, i) => {
        const x = gap + i * (BAR_W + gap);
        const totalH = (w.total / maxVal) * CHART_H;
        const doneH = (w.completed / maxVal) * CHART_H;
        return (
          <g key={i}>
            <rect x={x} y={CHART_H - totalH} width={BAR_W} height={totalH}
              fill="var(--border)" rx={3} />
            <rect x={x} y={CHART_H - doneH} width={BAR_W} height={doneH}
              fill="var(--primary)" rx={3} opacity={0.85} />
            {w.total > 0 && (
              <text x={x + BAR_W / 2} y={CHART_H - totalH - 4} textAnchor="middle"
                fill="var(--text-sub)" fontSize={9}>{w.total}</text>
            )}
            <text x={x + BAR_W / 2} y={CHART_H + 18} textAnchor="middle"
              fill="var(--text-sub)" fontSize={10}>{w.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ActivityHeatmap({ completedByDate }) {
  const today = todayStr();
  const weekStart = getWeekStart(today);
  const gridStart = addDays(weekStart, -11 * 7);

  const cells = Array.from({ length: 84 }, (_, i) => {
    const d = addDays(gridStart, i);
    return { date: d, count: completedByDate[d] || 0 };
  });

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  function cellColor(count) {
    if (count === 0) return 'var(--border)';
    const ratio = count / maxCount;
    if (ratio < 0.33) return 'rgba(99,102,241,0.3)';
    if (ratio < 0.66) return 'rgba(99,102,241,0.6)';
    return 'var(--primary)';
  }

  const weeks = Array.from({ length: 12 }, (_, w) => cells.slice(w * 7, (w + 1) * 7));
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start', minWidth: 'fit-content' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4, paddingTop: 18 }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ height: 14, fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '14px' }}>
              {i % 2 === 0 ? d : ''}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const firstDate = new Date(week[0].date + 'T00:00:00');
          const showMonth = firstDate.getDate() <= 7;
          return (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', height: 14, whiteSpace: 'nowrap' }}>
                {showMonth ? `${firstDate.getMonth() + 1}월` : ''}
              </div>
              {week.map((cell, di) => (
                <div key={di}
                  title={`${cell.date}: ${cell.count}개 완료`}
                  style={{ width: 14, height: 14, borderRadius: 2, background: cellColor(cell.count) }}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-sub)' }}>
        <span>적음</span>
        {['var(--border)', 'rgba(99,102,241,0.3)', 'rgba(99,102,241,0.6)', 'var(--primary)'].map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}

const PERIODS = [
  { key: 'week',  label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'last',  label: '지난 달' },
  { key: 'all',   label: '전체' },
];

export default function StatsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const data = await getTasksByUser(user.id);
      setTasks(data);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const today = todayStr();
    const now = new Date();
    if (period === 'week') {
      const ws = getWeekStart(today);
      return tasks.filter(t => t.date >= ws && t.date <= addDays(ws, 6));
    }
    if (period === 'month') {
      const { start, end } = getMonthRange(now.getFullYear(), now.getMonth());
      return tasks.filter(t => t.date >= start && t.date <= end);
    }
    if (period === 'last') {
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const { start, end } = getMonthRange(ly, lm);
      return tasks.filter(t => t.date >= start && t.date <= end);
    }
    return tasks;
  }, [tasks, period]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(t => t.completed).length;
    const rate = total > 0 ? Math.round(completed / total * 100) : 0;
    const today = todayStr();
    const overdue = filtered.filter(t => !t.completed && t.deadline && t.deadline < today).length;
    const byPriority = { high: 0, medium: 0, low: 0, none: 0 };
    filtered.forEach(t => { byPriority[t.priority || 'none']++; });
    return { total, completed, rate, overdue, byPriority };
  }, [filtered]);

  const allCompletedByDate = useMemo(() => {
    const map = {};
    tasks.filter(t => t.completed).forEach(t => { map[t.date] = (map[t.date] || 0) + 1; });
    return map;
  }, [tasks]);

  const weeklyTrend = useMemo(() => {
    const today = todayStr();
    const ws = getWeekStart(today);
    return Array.from({ length: 8 }, (_, i) => {
      const wStart = addDays(ws, (i - 7) * 7);
      const wEnd = addDays(wStart, 6);
      const inWeek = tasks.filter(t => t.date >= wStart && t.date <= wEnd);
      const d = new Date(wStart + 'T00:00:00');
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        total: inWeek.length,
        completed: inWeek.filter(t => t.completed).length,
      };
    });
  }, [tasks]);

  /* ── 집중 패턴: 요일별 + 시간대별 ── */
  const patternData = useMemo(() => {
    // 요일별 (0=일 ~ 6=토) 집계
    const weekdays = Array.from({ length: 7 }, (_, i) => ({
      day: i, label: ['일','월','화','수','목','금','토'][i], total: 0, done: 0,
    }));
    tasks.forEach(t => {
      const dow = new Date(t.date + 'T00:00:00').getDay();
      weekdays[dow].total++;
      if (t.completed) weekdays[dow].done++;
    });
    // 월~일 순서로 재정렬
    const ordered = [1,2,3,4,5,6,0].map(i => weekdays[i]);
    const bestDay = ordered
      .filter(d => d.total >= 3)
      .sort((a, b) => (b.done / b.total) - (a.done / a.total))[0] ?? null;

    // 시간대별 (updated_at 기준 완료 시간)
    const HOUR_BUCKETS = [
      { short: '새벽', range: [0,  4],  count: 0 },
      { short: '아침', range: [5,  9],  count: 0 },
      { short: '오전', range: [10, 12], count: 0 },
      { short: '오후', range: [13, 17], count: 0 },
      { short: '저녁', range: [18, 21], count: 0 },
      { short: '심야', range: [22, 23], count: 0 },
    ];
    tasks.filter(t => t.completed && t.updated_at).forEach(t => {
      const h = new Date(t.updated_at).getHours();
      const b = HOUR_BUCKETS.find(b => h >= b.range[0] && h <= b.range[1]);
      if (b) b.count++;
    });
    const bestHour = [...HOUR_BUCKETS].sort((a, b) => b.count - a.count)[0];
    return { ordered, bestDay, hourBuckets: HOUR_BUCKETS, bestHour };
  }, [tasks]);

  /* ── 미루기 감지 ── */
  const procData = useMemo(() => {
    const today = todayStr();
    const incomplete = tasks.filter(t => !t.completed);
    const overdue    = incomplete.filter(t => t.date < today);
    const mild     = overdue.filter(t => daysBetween(t.date, today) <= 3).length;
    const moderate = overdue.filter(t => { const d = daysBetween(t.date, today); return d > 3 && d <= 7; }).length;
    const severe   = overdue.filter(t => daysBetween(t.date, today) > 7).length;
    const score    = incomplete.length > 0
      ? Math.min(100, Math.round(overdue.length / incomplete.length * 100)) : 0;
    const topOverdue = [...overdue]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
    return { overdue: overdue.length, mild, moderate, severe, score, topOverdue };
  }, [tasks]);

  /* ── 실행률 트렌드 ── */
  const trendData = useMemo(() => {
    const today = todayStr();
    const now   = new Date();
    const rate  = (arr) => arr.length > 0
      ? Math.round(arr.filter(t => t.completed).length / arr.length * 100) : null;

    const thisWS = getWeekStart(today);
    const lastWS = addDays(thisWS, -7);
    const thisWeekTasks = tasks.filter(t => t.date >= thisWS && t.date <= addDays(thisWS, 6));
    const lastWeekTasks = tasks.filter(t => t.date >= lastWS && t.date <= addDays(lastWS, 6));

    const thisM = getMonthRange(now.getFullYear(), now.getMonth());
    const prevMDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastM = getMonthRange(prevMDate.getFullYear(), prevMDate.getMonth());
    const thisMonthTasks = tasks.filter(t => t.date >= thisM.start && t.date <= thisM.end);
    const lastMonthTasks = tasks.filter(t => t.date >= lastM.start && t.date <= lastM.end);

    return {
      week:  { current: rate(thisWeekTasks),  prev: rate(lastWeekTasks),  label: '이번 주',  sub: `vs 지난 주 ${rate(lastWeekTasks) ?? '?'}%` },
      month: { current: rate(thisMonthTasks), prev: rate(lastMonthTasks), label: '이번 달', sub: `vs 지난 달 ${rate(lastMonthTasks) ?? '?'}%` },
    };
  }, [tasks]);

  const now = new Date();
  const periodLabel = (() => {
    if (period === 'month') return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    if (period === 'last') {
      const lm = now.getMonth() === 0 ? 12 : now.getMonth();
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return `${ly}년 ${lm}월`;
    }
    if (period === 'week') return '이번 주';
    return '전체 기간';
  })();

  const rateColor = stats.rate >= 70 ? 'var(--green-500)' : stats.rate >= 40 ? 'var(--amber-500)' : 'var(--red-500)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="view-header">
        <div>
          <h2>통계 & 회고</h2>
          <p className="view-sub">할일 완료 현황과 생산성 패턴을 확인하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.key}
              onClick={() => setPeriod(p.key)}
              className={period === p.key ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px 40px', maxWidth: 720 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-sub)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem' }} />
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="전체 할일" value={stats.total} sub={periodLabel} />
              <StatCard label="완료" value={stats.completed} color="var(--green-500)" />
              <StatCard label="완료율" value={`${stats.rate}%`} color={rateColor} />
              <StatCard label="기한 초과" value={stats.overdue}
                color={stats.overdue > 0 ? 'var(--red-500)' : 'var(--text-sub)'} />
            </div>

            {/* 완료율 바 */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>완료율</span>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-sub)' }}>{stats.completed} / {stats.total}개</span>
              </div>
              <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 6, transition: 'width 0.8s ease',
                  width: `${stats.rate}%`, background: rateColor,
                }} />
              </div>
              {stats.total === 0 && (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                  이 기간에 등록된 할일이 없습니다.
                </div>
              )}
            </div>

            {/* 우선순위 분포 */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <i className="fas fa-chart-bar" style={{ color: 'var(--primary)', marginRight: 8 }} />
                우선순위 분포
              </div>
              <PriorityBar label="높음" count={stats.byPriority.high} total={stats.total} color="var(--red-500)" />
              <PriorityBar label="보통" count={stats.byPriority.medium} total={stats.total} color="var(--amber-500)" />
              <PriorityBar label="낮음" count={stats.byPriority.low} total={stats.total} color="var(--green-500)" />
              <PriorityBar label="미설정" count={stats.byPriority.none} total={stats.total} color="var(--text-muted)" />
            </div>

            {/* 주간 추세 */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 6, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <i className="fas fa-chart-line" style={{ color: 'var(--primary)', marginRight: 8 }} />
                주간 추세 (최근 8주)
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--border)', borderRadius: 2 }} />전체
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--primary)', borderRadius: 2, opacity: 0.85 }} />완료
                </span>
              </div>
              <WeeklyBarChart weeks={weeklyTrend} />
            </div>

            {/* 활동 히트맵 */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <i className="fas fa-fire" style={{ color: 'var(--primary)', marginRight: 8 }} />
                활동 히트맵 (최근 12주)
              </div>
              <ActivityHeatmap completedByDate={allCompletedByDate} />
            </div>

            {/* ── 행동 유도 분석 섹션 ── */}
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-brain" style={{ color: 'var(--primary)' }} />
              행동 패턴 분석
            </div>

            {/* 실행률 트렌드 */}
            <TrendCard data={trendData} />

            {/* 집중 패턴 */}
            <WeekdayPatternCard data={patternData} />

            {/* 미루기 감지 */}
            <ProcrastinationCard data={procData} />
          </>
        )}
      </div>
    </div>
  );
}
