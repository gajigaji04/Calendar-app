/**
 * 한국어 텍스트 분석 엔진
 * PDF / 회의록 / 강의계획서에서 날짜·할 일·액션 아이템을 추출합니다.
 *
 * 모드:
 *  - 'student' : 과제, 시험, 마감 중심
 *  - 'work'    : 액션 아이템, 담당자, 회의 결정 중심
 */

// ─── 상수 ─────────────────────────────────────────────────
const WEEKDAY_IDX = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };

// ─── 날짜 파서 ────────────────────────────────────────────
/**
 * "오늘" 기준으로 절대 날짜 문자열(YYYY-MM-DD)을 반환합니다.
 * 인식 패턴:
 *   YYYY년 M월 D일 / M월 D일 / 내일 / 모레 / 다음주 X요일 / 이번주 X요일 / 다음 X요일
 */
export function parseKoreanDate(text, today) {
  const base = new Date(today + 'T00:00:00');

  // 1) YYYY년 M월 D일
  let m = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return toISO(d);
  }

  // 2) M월 D일  (올해 or 내년)
  m = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (m) {
    const d = new Date(base.getFullYear(), +m[1] - 1, +m[2]);
    if (d < base) d.setFullYear(d.getFullYear() + 1);
    return toISO(d);
  }

  // 3) 상대 날짜
  if (/내일/.test(text))  { const d = offset(base, 1); return toISO(d); }
  if (/모레/.test(text))  { const d = offset(base, 2); return toISO(d); }
  if (/오늘/.test(text))  { return toISO(base); }

  // 4) 다음주 X요일 / 다음 X요일
  m = text.match(/다음\s*주?\s*([월화수목금토일])요일/);
  if (m) {
    const target = WEEKDAY_IDX[m[1]];
    const diff   = ((target - base.getDay() + 7) % 7) || 7;
    return toISO(offset(base, diff + 7));
  }

  // 5) 이번주 X요일
  m = text.match(/이번\s*주\s*([월화수목금토일])요일/);
  if (m) {
    const target = WEEKDAY_IDX[m[1]];
    const diff   = (target - base.getDay() + 7) % 7;
    return toISO(offset(base, diff));
  }

  return null;
}

function offset(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 학생용 패턴 ──────────────────────────────────────────
const STUDENT_PATTERNS = [
  // 과제 제출
  {
    re: /(.{2,30}?)\s*(과제|레포트|보고서|리포트)\s*(제출|마감|까지|까지\s*제출)/gi,
    type: 'assignment',
    extract: (m) => ({ title: `${trim(m[1])} 과제 제출`, raw: m[0] }),
  },
  // 시험 (중간고사, 기말고사, 쪽지시험 등)
  {
    re: /(.{0,20}?)(중간고사|기말고사|기말\s*시험|중간\s*시험|쪽지\s*시험|퀴즈)(.{0,20})/gi,
    type: 'exam',
    extract: (m) => ({ title: `${trim(m[2])}${m[3] ? ` (${trim(m[3])})` : ''}`, raw: m[0] }),
  },
  // X주차 / X번 발표
  {
    re: /(.{2,20}?)\s*(발표|프레젠테이션)\s*(준비|제출|마감)?/gi,
    type: 'presentation',
    extract: (m) => ({ title: `${trim(m[1])} 발표`, raw: m[0] }),
  },
  // 독서 / 읽기 과제
  {
    re: /(.{2,30}?)\s*(독후감|독서\s*과제|읽기\s*과제)/gi,
    type: 'reading',
    extract: (m) => ({ title: `${trim(m[1])} 독서 과제`, raw: m[0] }),
  },
  // 일반 마감
  {
    re: /(.{2,40}?)\s*(마감|데드라인|deadline)\s*[:\s]/gi,
    type: 'deadline',
    extract: (m) => ({ title: `${trim(m[1])} 마감`, raw: m[0] }),
  },
];

// ─── 직장인용 패턴 ────────────────────────────────────────
const WORK_PATTERNS = [
  // 액션 아이템 (- [ ] / - / ○ / ▶ 로 시작)
  {
    re: /^[\-\*○▶◆□]\s*(?:\[[ x]\]\s*)?(.{3,60}?)(?:\s*\/\s*담당자?\s*[:：]?\s*(.+?))?$/gim,
    type: 'action',
    extract: (m) => ({
      title: trim(m[1]),
      assignee: m[2] ? trim(m[2]) : null,
      raw: m[0],
    }),
  },
  // "~해주세요" / "~하기로 했습니다" / "~검토 필요"
  {
    re: /(.{5,60}?)\s*(해주세요|해주시기 바랍니다|하기로\s*했습니다|검토\s*필요|검토\s*해주세요|공유해\s*주세요|확인\s*부탁)/gi,
    type: 'action',
    extract: (m) => ({ title: trim(m[1]) + ' ' + trim(m[2]), raw: m[0] }),
  },
  // "N번 / N차 / 결정 사항"
  {
    re: /결정\s*사항\s*[:\s：](.{3,80})/gi,
    type: 'decision',
    extract: (m) => ({ title: `[결정] ${trim(m[1])}`, raw: m[0] }),
  },
  // "담당 : 홍길동 — ... 건"
  {
    re: /담당\s*[:：]\s*(.{2,15})\s+(.{5,60})/gi,
    type: 'action',
    extract: (m) => ({ title: trim(m[2]), assignee: trim(m[1]), raw: m[0] }),
  },
  // 회의 후속 조치
  {
    re: /후속\s*조치\s*[:\s：](.{3,80})/gi,
    type: 'followup',
    extract: (m) => ({ title: `[후속] ${trim(m[1])}`, raw: m[0] }),
  },
];

// ─── 날짜-문장 매칭 ───────────────────────────────────────
/** 문장에서 날짜를 찾아 반환 (없으면 null) */
function findDateInLine(line, today) {
  // 날짜 표현이 포함된 부분만 추출해서 parseKoreanDate 시도
  const datePatterns = [
    /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/,
    /\d{1,2}월\s*\d{1,2}일/,
    /다음\s*주?\s*[월화수목금토일]요일/,
    /이번\s*주\s*[월화수목금토일]요일/,
    /내일|모레|오늘/,
  ];
  for (const p of datePatterns) {
    const m = line.match(p);
    if (m) {
      const d = parseKoreanDate(m[0], today);
      if (d) return d;
    }
  }
  return null;
}

/** 이전 N줄에서 날짜 검색 (맥락상 날짜) */
function findDateInContext(lines, currentIdx, today, lookback = 4) {
  for (let i = Math.max(0, currentIdx - lookback); i <= currentIdx; i++) {
    const d = findDateInLine(lines[i], today);
    if (d) return d;
  }
  return null;
}

// ─── 우선순위 추론 ────────────────────────────────────────
function inferPriority(text) {
  if (/중간고사|기말고사|마감|데드라인|긴급|urgent|중요|필수/i.test(text)) return 'high';
  if (/과제|레포트|제출|시험|발표|검토|확인/i.test(text)) return 'medium';
  return 'low';
}

// ─── 메인 분석 함수 ───────────────────────────────────────
/**
 * @param {string} text    - 추출된 원문 텍스트
 * @param {string} mode    - 'student' | 'work'
 * @param {string} today   - YYYY-MM-DD
 * @returns {{ items: ExtractedItem[], stats: object }}
 */
export function analyzeText(text, mode, today) {
  const patterns = mode === 'student' ? STUDENT_PATTERNS : WORK_PATTERNS;
  const lines    = text.split(/\r?\n/);
  const found    = [];
  const seen     = new Set();

  for (const { re, type, extract } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const info  = extract(m);
      const title = info.title;
      if (!title || title.length < 3) continue;
      const key = title.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) continue;
      seen.add(key);

      // 매치된 위치의 줄 번호 찾기
      const before = text.slice(0, m.index);
      const lineIdx = before.split('\n').length - 1;

      const date = findDateInContext(lines, lineIdx, today);

      found.push({
        id:       `item-${found.length}`,
        type,
        title:    title.slice(0, 80),
        date,
        deadline: date,
        assignee: info.assignee ?? null,
        priority: inferPriority(info.raw),
        raw:      info.raw.trim().slice(0, 120),
        accepted: true,
      });
    }
  }

  // 날짜순 정렬 (null은 뒤로)
  found.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return {
    items: found,
    stats: {
      total:      found.length,
      withDate:   found.filter(i => i.date).length,
      byType:     groupBy(found, 'type'),
    },
  };
}

function trim(s) { return s ? s.trim().replace(/\s+/g, ' ') : ''; }
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}
