export const runtime = 'nodejs';

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const SYSTEM = `당신은 스마트 캘린더 앱의 AI 생산성 비서입니다.
사용자의 일정 관리, 할일 우선순위 설정, 생산성 향상에 관한 질문에 친절하고 간결하게 답변하세요.
답변은 한국어로, 2-4문장 이내로 간결하게 작성하세요.
불필요한 인사말이나 서론 없이 바로 핵심 답변을 드리세요.`;

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }, { status: 503 });
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

  try {
    const client = new Anthropic();
    const stream = client.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     systemPrompt,
      messages:   messages.slice(-10), // 최근 10개만 전송
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              );
            }
          }
        } catch (e) {
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
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
