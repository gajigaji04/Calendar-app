/**
 * Notion API 헬퍼
 *
 * 사용자는 Notion Integration Token과 Database ID를 직접 입력합니다.
 * https://www.notion.so/my-integrations 에서 토큰을 생성하세요.
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionFetch(token, path, options = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization:     `Bearer ${token}`,
      'Notion-Version':  NOTION_VERSION,
      'Content-Type':    'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Notion API ${res.status}`);
  }
  return res.json();
}

/** 토큰 + DB ID 검증 */
export async function testConnection(token, databaseId) {
  const db = await notionFetch(token, `/databases/${databaseId}`);
  return { title: db.title?.[0]?.plain_text ?? 'Database', id: db.id };
}

/** Notion DB의 모든 페이지(tasks) 가져오기 */
export async function getPages(token, databaseId) {
  const pages = [];
  let cursor  = undefined;

  do {
    const res = await notionFetch(token, `/databases/${databaseId}/query`, {
      method: 'POST',
      body:   JSON.stringify(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return pages;
}

/** Notion 페이지 → 우리 태스크 포맷 */
export function pageToTask(page, userId) {
  const props = page.properties ?? {};

  // 제목
  const titleProp = Object.values(props).find(p => p.type === 'title');
  const title = titleProp?.title?.map(t => t.plain_text).join('') ?? '(제목 없음)';

  // 날짜
  const dateProp = Object.values(props).find(p => p.type === 'date' && p.date);
  const date = dateProp?.date?.start ?? new Date().toISOString().split('T')[0];

  // 완료 여부
  const checkProp = Object.values(props).find(p => p.type === 'checkbox');
  const completed = checkProp?.checkbox ?? false;

  // 선택 (우선순위)
  const selectProp = Object.values(props).find(p =>
    p.type === 'select' && p.select &&
    ['high', 'medium', 'low', '높음', '보통', '낮음'].includes(p.select.name)
  );
  const priorityMap = { high: 'high', medium: 'medium', low: 'low', 높음: 'high', 보통: 'medium', 낮음: 'low' };
  const priority = priorityMap[selectProp?.select?.name] ?? 'medium';

  return {
    user_id:    userId,
    title,
    date,
    completed,
    priority,
    category:   'Notion',
    notion_page_id: page.id,
  };
}

/** 우리 태스크 → Notion 페이지 생성 payload */
export function taskToPage(task, databaseId) {
  const priorityKo = { high: '높음', medium: '보통', low: '낮음' };
  return {
    parent:     { database_id: databaseId },
    properties: {
      이름: {
        title: [{ text: { content: task.title } }],
      },
      날짜: {
        date: { start: task.date },
      },
      완료: {
        checkbox: task.completed ?? false,
      },
      우선순위: {
        select: { name: priorityKo[task.priority] ?? '보통' },
      },
    },
  };
}

/** 페이지 생성 */
export async function createPage(token, task, databaseId) {
  return notionFetch(token, '/pages', {
    method: 'POST',
    body:   JSON.stringify(taskToPage(task, databaseId)),
  });
}

/** 페이지 업데이트 (완료 여부 동기화) */
export async function updatePage(token, pageId, updates) {
  const properties = {};
  if (updates.completed !== undefined) {
    properties['완료'] = { checkbox: updates.completed };
  }
  if (updates.title) {
    properties['이름'] = { title: [{ text: { content: updates.title } }] };
  }
  return notionFetch(token, `/pages/${pageId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ properties }),
  });
}
