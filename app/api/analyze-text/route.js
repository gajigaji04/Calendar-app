export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `당신은 텍스트에서 일정/할 일 항목을 추출하는 파서입니다.
주어진 텍스트에서 모든 일정, 과제, 마감일, 액션 아이템을 빠짐없이 추출하세요.
반드시 JSON 배열만 반환하세요. 설명이나 마크다운 코드블록 없이 순수 JSON만 출력하세요.

각 항목 형식:
{
  "title": "할 일 제목 (간결하게)",
  "date": "YYYY-MM-DD 또는 null (날짜가 불명확하면 null)",
  "type": "assignment|exam|presentation|reading|deadline|action|decision|followup|meeting|other",
  "priority": "high|medium|low",
  "assignee": "담당자 이름 또는 null",
  "raw": "원문 발췌 (최대 100자)"
}

날짜 추출 규칙:
- "M월 D일", "M/D", "MM.DD", "YYYY-MM-DD" 등 모든 형식 인식
- 오늘 기준 상대 날짜(내일, 다음주 월요일 등) 계산
- 연도가 없으면 올해로 처리 (이미 지났으면 내년)
- 명확하지 않으면 null`;

/**
 * POST /api/analyze-text
 * body: { text: string, mode: 'student' | 'work', today: 'YYYY-MM-DD' }
 */
export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { text, mode = 'student', today } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: '텍스트가 없습니다.' }, { status: 400 });
  }

  const modeGuide = mode === 'student'
    ? '학생 모드: 과제, 시험, 제출 마감, 발표, 독서 과제 위주로 추출하세요.'
    : '직장인 모드: 액션 아이템, 담당자 지정 업무, 회의 결정사항, 마감 위주로 추출하세요.';

  const userPrompt = `오늘 날짜: ${today}
${modeGuide}

아래 텍스트에서 모든 일정/할 일을 추출하세요:
---
${text.slice(0, 6000)}
---`;

  try {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages:    [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        temperature:     0.1,
        max_tokens:      2048,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `Groq API ${res.status}`);
    }

    const json    = await res.json();
    const content = json.choices?.[0]?.message?.content ?? '[]';

    let parsed;
    try {
      const raw = JSON.parse(content);
      // response_format: json_object 는 최상위가 객체여야 해서 {items:[...]} 또는 [...] 둘 다 처리
      parsed = Array.isArray(raw) ? raw : (raw.items ?? raw.tasks ?? Object.values(raw)[0] ?? []);
    } catch {
      parsed = [];
    }

    if (!Array.isArray(parsed)) parsed = [];

    const items = parsed
      .filter(i => i?.title?.length >= 2)
      .map((i, idx) => ({
        id:       `item-${idx}`,
        type:     i.type     ?? 'action',
        title:    String(i.title).slice(0, 80),
        date:     i.date     ?? null,
        deadline: i.date     ?? null,
        assignee: i.assignee ?? null,
        priority: i.priority ?? 'medium',
        raw:      String(i.raw ?? i.title).slice(0, 120),
        accepted: true,
      }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[analyze-text]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
