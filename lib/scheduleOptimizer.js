/**
 * 규칙 기반 스마트 일정 재배치 엔진
 * 외부 AI 없이 순수 알고리즘으로 동작합니다.
 *
 * 핵심 로직:
 *  1. 미래 미완료 태스크를 날짜별로 묶어 "부하 점수"를 계산
 *  2. 임계치(7점) 이상인 "과부하 날"을 탐지
 *  3. 낮은 우선순위 태스크를 "여유 있는 날(4점 미만)"로 이동 제안
 *  4. 마감일을 절대 넘기지 않도록 제약 조건 적용
 */

// ─── 상수 ───────────────────────────────────────────────
const OVERLOAD_THRESHOLD = 7;   // 이 이상 → 과부하
const LIGHT_THRESHOLD    = 4;   // 이 미만  → 여유
const LOOKAHEAD_DAYS     = 21;  // 앞으로 몇 일까지 탐색

// ─── 유틸 ────────────────────────────────────────────────
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function daysBetween(a, b) {
  return Math.round(
    (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000
  );
}

export function formatDateKo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${weekday})`;
}

/** 태스크 부하 가중치 */
function getWeight(task) {
  return { high: 3, medium: 2, low: 1 }[task.priority] ?? 1;
}

// ─── 메인 분석 함수 ──────────────────────────────────────
/**
 * @param {Array}  tasks - 전체 태스크 배열
 * @param {string} today - YYYY-MM-DD
 * @returns {{ proposals, overloadedDays, warnings, stats }}
 */
export function analyzeSchedule(tasks, today) {
  /* 1. 분석 대상 필터링 */
  const future = tasks.filter(t => !t.completed && t.date >= today);
  if (future.length === 0) {
    return { proposals: [], overloadedDays: [], warnings: [], stats: { totalFuture: 0, overloadCount: 0, proposalCount: 0 } };
  }

  /* 2. 날짜별 부하 맵과 태스크 맵 구축 (시뮬레이션용 deep copy) */
  const loadMap  = {};  // { date: score }
  const dayTasks = {};  // { date: task[] }

  future.forEach(t => {
    loadMap[t.date]  = (loadMap[t.date]  || 0) + getWeight(t);
    dayTasks[t.date] = dayTasks[t.date] || [];
    dayTasks[t.date].push({ ...t });
  });

  /* 3. 과부하 날 탐지 */
  const overloadedDays = Object.entries(loadMap)
    .filter(([, s]) => s >= OVERLOAD_THRESHOLD)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, score]) => ({ date, score }));

  /* 4. 경고: 마감일 임박 + 일정 과다 */
  const warnings = [];
  future.forEach(t => {
    if (!t.deadline) return;
    const gap = daysBetween(today, t.deadline);
    const load = loadMap[t.date] || 0;
    if (gap <= 3 && load >= OVERLOAD_THRESHOLD && t.priority !== 'high') {
      warnings.push({
        taskId: t.id,
        title: t.title,
        deadline: t.deadline,
        message: `마감 ${gap === 0 ? 'D-Day' : `D-${gap}`}: 과부하 날(${formatDateKo(t.date)})에 배치됨`,
      });
    }
  });

  /* 5. 이동 제안 생성 */
  const proposals = [];
  const proposed  = new Set(); // 이미 제안된 task id

  for (const { date: overDate } of overloadedDays) {
    const candidates = (dayTasks[overDate] || [])
      .filter(t => {
        if (proposed.has(t.id)) return false;
        // 당일 마감 or 내일 마감 → 이동 불가
        if (t.deadline) {
          const gap = daysBetween(overDate, t.deadline);
          if (gap <= 1) return false;
        }
        // 높은 우선순위 + 마감 없음 → 이동 안 함
        if (t.priority === 'high' && !t.deadline) return false;
        return true;
      })
      // 낮은 우선순위부터 이동 후보로
      .sort((a, b) => (getWeight(a) - getWeight(b)));

    for (const task of candidates) {
      // 과부하가 해소됐으면 중단
      if ((loadMap[overDate] || 0) < OVERLOAD_THRESHOLD) break;

      const target = findLightDay(loadMap, task, overDate, today);
      if (!target) continue;

      const w = getWeight(task);
      // 시뮬레이션 업데이트
      loadMap[overDate] = (loadMap[overDate] || 0) - w;
      loadMap[target]   = (loadMap[target]   || 0) + w;
      dayTasks[overDate] = dayTasks[overDate].filter(t => t.id !== task.id);
      (dayTasks[target] = dayTasks[target] || []).push({ ...task, date: target });
      proposed.add(task.id);

      proposals.push({
        id: `${task.id}__${overDate}__${target}`,
        task: { ...task },
        fromDate: overDate,
        toDate: target,
        reason: buildReason(overDate, task, loadMap),
        loadBefore: (loadMap[overDate] || 0) + w,
        accepted: true,
      });
    }
  }

  return {
    proposals,
    overloadedDays,
    warnings,
    stats: {
      totalFuture:   future.length,
      overloadCount: overloadedDays.length,
      proposalCount: proposals.length,
    },
  };
}

/** 이동 가능한 가장 가까운 여유 날 탐색 */
function findLightDay(loadMap, task, afterDate, today) {
  const deadline = task.deadline ?? null;

  for (let i = 1; i <= LOOKAHEAD_DAYS; i++) {
    const d = addDays(afterDate, i);
    if (d < today) continue;
    if (deadline && d > deadline) break;
    if ((loadMap[d] || 0) < LIGHT_THRESHOLD) return d;
  }
  // 마감 앞쪽(오늘 이후~overDate 이전)도 탐색
  for (let i = 1; i < daysBetween(today, afterDate); i++) {
    const d = addDays(today, i);
    if (d >= afterDate) break;
    if ((loadMap[d] || 0) < LIGHT_THRESHOLD) return d;
  }
  return null;
}

/** 재배치 이유 생성 */
function buildReason(fromDate, task, loadMap) {
  const score = (loadMap[fromDate] || 0) + getWeight(task);
  const parts = [];
  if (score >= OVERLOAD_THRESHOLD) {
    parts.push(`${formatDateKo(fromDate)} 과부하 (부하 ${score}점)`);
  }
  const p = task.priority;
  if (p === 'low')    parts.push('낮은 우선순위 분산');
  else if (p === 'medium') parts.push('중간 우선순위 분산');
  else                parts.push('업무량 균형 조정');
  return parts.join(' · ');
}

/** 날 요약 통계 (오늘 기준 ±2주) */
export function buildWeekSummary(tasks, today) {
  const summary = {};
  const end = addDays(today, 13);
  tasks.forEach(t => {
    if (t.completed || t.date < today || t.date > end) return;
    summary[t.date] = summary[t.date] || { total: 0, score: 0 };
    summary[t.date].total++;
    summary[t.date].score += getWeight(t);
  });
  return summary;
}
