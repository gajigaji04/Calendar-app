export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { notifyServerError } from '@/lib/slackNotify';

const SYSTEM =`당신은 스마트 캘린더 앱의 AI 생산성 비서입니다.
사용자의 일정 관리, 할일 우선순위 설정, 생산성 향상에 관한 질문에 친절하고 간결하게 답변하세요.
답변은 한국어로, 2-4문장 이내로 간결하게 작성하세요.
불필요한 인사말이나 서론 없이 바로 핵심 답변을 드리세요.

[중요] 사용자 컨텍스트가 제공된 경우, 반드시 그 데이터만 기반으로 답변하세요.
일정이나 할일을 절대로 지어내거나 추측하지 마세요.
컨텍스트에 없는 정보는 "등록된 일정이 없습니다"라고 명확히 말하세요.`;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

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
    ? `${SYSTEM}\n\n[사용자 컨텍스트]\n${context}`
    : SYSTEM;

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
