/**
 * Slack Incoming Webhook 헬퍼
 *
 * 사용자는 Slack 앱의 Incoming Webhook URL을 직접 입력합니다.
 * https://api.slack.com/messaging/webhooks
 */

export async function testWebhook(webhookUrl) {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      text: '✅ *캘린더 앱 연동 테스트* — 알림이 정상적으로 전송되었습니다!',
    }),
  });
  if (!res.ok && res.status !== 200) {
    throw new Error(`Slack webhook 오류 (${res.status})`);
  }
  const text = await res.text();
  if (text !== 'ok') throw new Error(`Slack 응답: ${text}`);
}

export async function sendMessage(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Slack 전송 실패 (${res.status})`);
}

/** 오늘 할 일 요약 메시지 블록 */
export function buildDailySummary(tasks, today) {
  const todayTasks   = tasks.filter(t => !t.completed && t.date === today);
  const overdueTasks = tasks.filter(t => !t.completed && t.date < today);
  const priority = { high: '🔴', medium: '🟡', low: '🟢' };

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📅 오늘의 할 일 요약 (${formatKo(today)})`, emoji: true },
    },
    { type: 'divider' },
  ];

  if (todayTasks.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*오늘 할 일 (${todayTasks.length}개)*\n` +
          todayTasks.map(t => `${priority[t.priority] ?? '⚪'} ${t.title}`).join('\n'),
      },
    });
  } else {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '오늘 예정된 할 일이 없습니다 🎉' },
    });
  }

  if (overdueTasks.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠ 미완료 항목 (${overdueTasks.length}개)*\n` +
            overdueTasks.slice(0, 5).map(t => `• ${t.title} — _${formatKo(t.date)}_`).join('\n') +
            (overdueTasks.length > 5 ? `\n_... 외 ${overdueTasks.length - 5}개_` : ''),
        },
      }
    );
  }

  blocks.push({ type: 'divider' });
  return { blocks, text: `오늘의 할 일: ${todayTasks.length}개` };
}

/** 마감 임박 알림 */
export function buildDueSoonAlert(tasks, today) {
  const soon = tasks.filter(t => {
    if (t.completed || !t.deadline) return false;
    const gap = Math.round((new Date(t.deadline + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    return gap >= 0 && gap <= 2;
  });

  if (soon.length === 0) return null;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '⏰ 마감 임박 알림', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: soon.map(t => {
          const gap = Math.round((new Date(t.deadline + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
          return `🚨 *${t.title}* — 마감 ${gap === 0 ? 'D-Day' : `D-${gap}`} (${formatKo(t.deadline)})`;
        }).join('\n'),
      },
    },
  ];

  return { blocks, text: `마감 임박: ${soon.length}개` };
}

function formatKo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${wd})`;
}
