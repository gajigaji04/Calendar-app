export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { notifyServerError } from '@/lib/slackNotify';

const SYSTEM = `당신은 TeamCalendar의 AI 일정 비서입니다. 한국어로만 답변하세요.

■ 절대 규칙 (위반 불가)
1. 아래 [사용자 일정 데이터] 섹션에 명시된 일정만 말할 수 있습니다.
2. 데이터에 없는 일정·제목·날짜는 절대 만들어내거나 추측하지 마세요.
3. 일정 제목은 데이터에 쓰인 그대로만 사용하세요. 임의로 바꾸거나 추가하지 마세요.
4. 해당 날짜/범위에 데이터가 없으면 반드시 "해당 기간에 등록된 일정이 없습니다"라고만 하세요.
5. 아래 데이터는 매 메시지마다 실시간으로 갱신된 최신 데이터입니다. 대화 이력에서 언급된 일정 내용보다 반드시 아래 데이터를 우선합니다. 대화 이력에 있던 일정이 현재 데이터에 없으면 "현재 등록된 일정이 아닙니다"라고 답하세요.
6. (일시적으로 조회할 수 없습니다)라고 표시된 섹션은 데이터 조회 오류입니다. 해당 섹션에 대해서는 "일정을 확인할 수 없습니다"라고만 하세요.

■ 답변 방법
- 질문한 날짜·범위에 해당하는 항목만 데이터에서 골라 나열하세요.
- 날짜 범위 계산: 데이터의 날짜(요일) 표기를 보고 직접 필터링하세요.
- [긴급] 항목은 🔴, 나머지는 📅, 날짜순 정렬.
- [팀 일정], [내 담당] 표시 항목도 포함하세요.
- 3개 이상이면 번호 목록. 서론 없이 바로 목록.`;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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

  const { messages = [], context = '' } = body;
  if (!messages.length) {
    return NextResponse.json({ error: 'messages가 필요합니다.' }, { status: 400 });
  }

  const systemPrompt = context
    ? `${SYSTEM}\n\n=== 사용자 일정 데이터 (이것만 사용하세요) ===\n${context}\n=== 데이터 끝 ===`
    : `${SYSTEM}\n\n=== 사용자 일정 데이터 ===\n(데이터 없음 — 일정을 조회할 수 없습니다)\n=== 데이터 끝 ===`;

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:      GROQ_MODEL,
        max_tokens: 512,
        stream:     true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Groq 연결 실패: ${err.message}` }, { status: 503 });
  }

  if (!groqRes.ok) {
    const text = await groqRes.text().catch(() => groqRes.status);
    return NextResponse.json({ error: `Groq 오류: ${text}` }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body.getReader();
      const dec    = new TextDecoder();
      let   buf    = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json  = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`)
                );
              }
            } catch { /* skip malformed line */ }
          }
        }
      } catch (e) {
        await notifyServerError({ path: '/api/ai/chat', message: e.message, stack: e.stack });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`)
        );
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
