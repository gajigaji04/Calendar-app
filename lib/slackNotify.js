const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function send(payload) {
  if (!WEBHOOK_URL) return; // 미설정 시 조용히 무시
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // 슬랙 알림 실패가 본 요청에 영향을 주지 않도록 무시
  }
}

function now() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/** 결제 성공 알림 */
export async function notifyPaymentSuccess({ email, amount, currency = 'KRW', plan }) {
  const formatted = Number(amount).toLocaleString('ko-KR');
  await send({
    text: '✅ 결제 성공',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '✅ 결제 성공', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*이메일*\n${email ?? '—'}` },
          { type: 'mrkdwn', text: `*금액*\n${formatted} ${currency}` },
          { type: 'mrkdwn', text: `*플랜*\n${plan ?? '—'}` },
          { type: 'mrkdwn', text: `*시각*\n${now()}` },
        ],
      },
    ],
  });
}

/** 결제 실패 알림 */
export async function notifyPaymentFailure({ email, reason, plan }) {
  await send({
    text: '❌ 결제 실패',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '❌ 결제 실패', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*이메일*\n${email ?? '—'}` },
          { type: 'mrkdwn', text: `*플랜*\n${plan ?? '—'}` },
          { type: 'mrkdwn', text: `*사유*\n${reason ?? '알 수 없음'}` },
          { type: 'mrkdwn', text: `*시각*\n${now()}` },
        ],
      },
    ],
  });
}

/** 서버 에러 (500) 알림 */
export async function notifyServerError({ path, message, stack }) {
  await send({
    text: '🚨 서버 에러 (500)',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🚨 서버 에러 (500)', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*발생 경로*\n\`${path ?? 'unknown'}\`` },
          { type: 'mrkdwn', text: `*시각*\n${now()}` },
          { type: 'mrkdwn', text: `*에러 메시지*\n${message ?? '알 수 없음'}` },
        ],
      },
      ...(stack ? [{
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `\`\`\`${stack.slice(0, 500)}\`\`\``,
        }],
      }] : []),
    ],
  });
}

/**
 * API 핸들러를 감싸 500 에러 발생 시 슬랙 알림을 보내는 래퍼.
 *
 * 사용법:
 *   export const POST = withErrorNotify('/api/example', async (req) => { ... });
 */
export function withErrorNotify(path, handler) {
  return async function (request, ctx) {
    try {
      return await handler(request, ctx);
    } catch (err) {
      await notifyServerError({
        path,
        message: err?.message,
        stack:   err?.stack,
      });
      return new Response(
        JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
