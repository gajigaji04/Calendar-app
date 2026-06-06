export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getServerUser } from '@/lib/supabaseServer';
import { notifyServerError } from '@/lib/slackNotify';

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(base, n) {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
function getWeekday(baseMonday, targetDay) {
  // targetDay: 1=월 2=화 3=수 4=목 5=금 6=토 0=일
  const offset = targetDay === 0 ? 6 : targetDay - 1;
  return addDays(baseMonday, offset);
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function POST(request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI 서비스 미설정' }, { status: 503 });
  }

  const { text } = await request.json().catch(() => ({}));
  if (!text?.trim()) return NextResponse.json({ error: 'text가 필요합니다.' }, { status: 400 });

  const now      = new Date();
  const today    = toDateStr(now);
  const tomorrow = addDays(today, 1);
  const dow      = now.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisMonday   = addDays(today, mondayOffset);
  const nextMonday   = addDays(thisMonday, 7);

  const DOW_KO = ['일','월','화','수','목','금','토'];
  const dayRef = [1,2,3,4,5,6,0].map(d => `이번 주 ${DOW_KO[d]}요일(${getWeekday(thisMonday, d)})`).join(', ');
  const nextRef = [1,2,3,4,5,6,0].map(d => `다음 주 ${DOW_KO[d]}요일(${getWeekday(nextMonday, d)})`).join(', ');

  const system = `당신은 한국어 자연어를 캘린더 일정 JSON으로 변환하는 파서입니다.
반드시 순수 JSON 객체만 반환하고 마크다운 코드블록이나 다른 텍스트는 쓰지 마세요.

오늘: ${today} (${DOW_KO[dow]}요일)  내일: ${tomorrow}  모레: ${addDays(tomorrow,1)}
${dayRef}
${nextRef}
다음 주 월요일: ${nextMonday}

반환 형식:
{"tasks":[{"title":"...","date":"YYYY-MM-DD","due_time":"HH:MM 또는 null","deadline":"YYYY-MM-DD 또는 null","priority":"high|medium|low","recurrence":"none|daily|weekly|monthly","description":""}],"message":"확인 메시지 1문장"}

규칙:
- 날짜 미언급 시 오늘(${today}) 사용
- 오전/오후 시간 → 24시간 형식 (오후 3시→15:00, 오전 10시→10:00)
- 기간 일정(~부터 ~까지) → date=시작, deadline=마감
- 긴급/중요/높은 → priority:high
- 매주/매일/매월 → recurrence 설정
- 일정이 여러 개면 tasks 배열에 모두 포함`;

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 512,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: text },
        ],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `AI 연결 실패: ${err.message}` }, { status: 503 });
  }

  if (!groqRes.ok) {
    const t = await groqRes.text().catch(() => '');
    return NextResponse.json({ error: `AI 오류: ${t}` }, { status: 502 });
  }

  let result;
  try {
    const data    = await groqRes.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    // JSON 블록 추출 (```json ... ``` 대응)
    const jsonStr = content.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    result = JSON.parse(jsonStr);
    if (!Array.isArray(result.tasks)) throw new Error('tasks 배열 없음');
  } catch (err) {
    await notifyServerError({ path: '/api/ai/schedule', message: err.message });
    return NextResponse.json({ error: '일정 파싱 실패. 다시 시도해 주세요.' }, { status: 500 });
  }

  return NextResponse.json(result);
}
