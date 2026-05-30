/**
 * 규칙 기반 일정 분석 엔진
 * AI API 없이 순수 알고리즘으로 동작합니다.
 *
 * 분석 항목:
 *  1. 시간 충돌  — 같은 날 due_time이 겹치는 태스크
 *  2. 빽빽한 일정 — 회의 사이 휴식 없이 연속 배치
 *  3. 마감 임박  — deadline D-3 이내 미완료
 *  4. 기한 초과  — deadline 지났지만 미완료
 *  5. 과부하 날  — 하루 할일 6개 이상
 *  6. 야간 일정  — due_time 22:00 이후
 *  7. 수면 위험  — 22시 이후 + 다음날 08시 이전 = 수면 6h 미만 우려
 */

const DEFAULT_DURATION_MIN = 60; // 태스크 기본 소요 시간(분)
const BREAK_MIN            = 15; // 권장 최소 휴식(분)
const SLEEP_START          = 22 * 60; // 22:00 in minutes
const SLEEP_END            = 8  * 60; // 08:00 in minutes
const DENSE_WARN           = 6;
const DENSE_ERR            = 9;

// ─── 유틸 ────────────────────────────────────────────────
function toMin(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function fmtTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function daysBetween(a, b) {
  return Math.round(
    (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86_400_000
  );
}

function formatKo(ds) {
  const d = new Date(ds + 'T00:00:00');
  const wd = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getMonth()+1}/${d.getDate()}(${wd})`;
}

// ─── 메인 분석 ───────────────────────────────────────────
/**
 * @param {Array}  tasks  - 사용자 전체 태스크 배열
 * @param {string} today  - YYYY-MM-DD
 * @returns {Alert[]}
 */
export function analyzeRules(tasks, today) {
  const alerts = [];
  const future  = tasks.filter(t => !t.completed);
  const byDate  = groupByDate(future);

  // ① 기한 초과
  future.forEach(t => {
    if (!t.deadline) return;
    const diff = daysBetween(today, t.deadline);
    if (diff < 0) {
      alerts.push({
        id:       `overdue-${t.id}`,
        type:     'overdue',
        severity: 'error',
        icon:     'fa-circle-xmark',
        title:    '기한 초과',
        message:  `"${t.title}" — ${formatKo(t.deadline)} 마감이 ${Math.abs(diff)}일 지났습니다.`,
        date:     t.date,
        taskIds:  [t.id],
      });
    }
  });

  // ② 마감 임박 (D-3 ~ D-0)
  future.forEach(t => {
    if (!t.deadline) return;
    const diff = daysBetween(today, t.deadline);
    if (diff >= 0 && diff <= 3) {
      const label = diff === 0 ? 'D-Day' : `D-${diff}`;
      alerts.push({
        id:       `deadline-${t.id}`,
        type:     'deadline',
        severity: diff <= 1 ? 'error' : 'warning',
        icon:     'fa-clock',
        title:    `마감 임박 ${label}`,
        message:  `"${t.title}" 마감 ${formatKo(t.deadline)}`,
        date:     t.date,
        taskIds:  [t.id],
      });
    }
  });

  // ③ 시간 충돌 + 빽빽한 일정 (due_time 있는 태스크)
  Object.entries(byDate).forEach(([date, dayTasks]) => {
    const timed = dayTasks
      .filter(t => t.due_time)
      .sort((a, b) => a.due_time.localeCompare(b.due_time));

    for (let i = 0; i < timed.length; i++) {
      const a      = timed[i];
      const aStart = toMin(a.due_time);
      const aEnd   = aStart + DEFAULT_DURATION_MIN;

      for (let j = i + 1; j < timed.length; j++) {
        const b      = timed[j];
        const bStart = toMin(b.due_time);

        if (bStart < aEnd) {
          // 충돌
          const overlap = aEnd - bStart;
          alerts.push({
            id:       `conflict-${a.id}-${b.id}`,
            type:     'conflict',
            severity: 'error',
            icon:     'fa-circle-exclamation',
            title:    '일정 충돌',
            message:  `${formatKo(date)} "${a.title}"(${a.due_time}) 과 "${b.title}"(${b.due_time}) 가 ${overlap}분 겹칩니다.`,
            date,
            taskIds:  [a.id, b.id],
          });
        } else if (bStart - aEnd < BREAK_MIN && bStart >= aEnd) {
          // 휴식 없는 연속 일정
          alerts.push({
            id:       `nobreak-${a.id}-${b.id}`,
            type:     'no_break',
            severity: 'warning',
            icon:     'fa-mug-hot',
            title:    '연속 일정 — 휴식 필요',
            message:  `${formatKo(date)} "${a.title}" 끝(${fmtTime(aEnd)})→ "${b.title}" 시작(${b.due_time}) 사이 ${bStart - aEnd}분. 15분 휴식을 추가하세요.`,
            date,
            taskIds:  [a.id, b.id],
          });
        }
      }
    }

    // ④ 야간 일정 + 수면 위험
    const lateNight = timed.filter(t => toMin(t.due_time) >= SLEEP_START);
    if (lateNight.length > 0) {
      alerts.push({
        id:       `late-${date}`,
        type:     'late_night',
        severity: 'warning',
        icon:     'fa-moon',
        title:    '야간 일정',
        message:  `${formatKo(date)} 22시 이후 할일 ${lateNight.length}개. 충분한 수면(7~8h)을 위해 조정을 고려하세요.`,
        date,
        taskIds:  lateNight.map(t => t.id),
      });

      // 다음날 이른 일정이 있으면 수면 위험 추가
      const nextDate  = addOneDay(date);
      const nextTasks = (byDate[nextDate] ?? []).filter(t => t.due_time && toMin(t.due_time) < SLEEP_END);
      if (nextTasks.length > 0) {
        const latest  = Math.max(...lateNight.map(t => toMin(t.due_time) + DEFAULT_DURATION_MIN));
        const earliest = Math.min(...nextTasks.map(t => toMin(t.due_time)));
        const sleep   = (24 * 60 - latest) + earliest;
        if (sleep < 6 * 60) {
          alerts.push({
            id:       `sleep-${date}`,
            type:     'sleep',
            severity: 'error',
            icon:     'fa-bed',
            title:    '수면 부족 위험',
            message:  `${formatKo(date)} 야간 일정 → ${formatKo(nextDate)} 오전 일정 간 수면 예상 ${Math.floor(sleep/60)}시간 ${sleep%60}분. 일정 조정을 권장합니다.`,
            date,
            taskIds:  [...lateNight.map(t => t.id), ...nextTasks.map(t => t.id)],
          });
        }
      }
    }

    // ⑤ 과부하 날
    if (dayTasks.length >= DENSE_ERR) {
      alerts.push({
        id:       `dense-${date}`,
        type:     'dense',
        severity: 'warning',
        icon:     'fa-fire',
        title:    '과부하 날',
        message:  `${formatKo(date)} 할일 ${dayTasks.length}개. 일부를 다른 날로 분산하는 것을 권장합니다.`,
        date,
        taskIds:  dayTasks.map(t => t.id),
      });
    } else if (dayTasks.length >= DENSE_WARN) {
      alerts.push({
        id:       `dense-${date}`,
        type:     'dense',
        severity: 'info',
        icon:     'fa-layer-group',
        title:    '일정 집중',
        message:  `${formatKo(date)} 할일 ${dayTasks.length}개가 몰려 있습니다.`,
        date,
        taskIds:  dayTasks.map(t => t.id),
      });
    }
  });

  // severity 순 정렬: error → warning → info
  const order = { error: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ─── 요약 통계 ───────────────────────────────────────────
export function summarizeAlerts(alerts) {
  return {
    total:   alerts.length,
    error:   alerts.filter(a => a.severity === 'error').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info:    alerts.filter(a => a.severity === 'info').length,
  };
}

// ─── 헬퍼 ────────────────────────────────────────────────
function groupByDate(tasks) {
  const map = {};
  tasks.forEach(t => { (map[t.date] = map[t.date] ?? []).push(t); });
  return map;
}

function addOneDay(ds) {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
