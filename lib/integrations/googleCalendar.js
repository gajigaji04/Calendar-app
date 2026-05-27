/**
 * Google Calendar REST API 헬퍼 (googleapis 패키지 불필요)
 *
 * 필요 환경변수:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL  (예: https://your-app.vercel.app)
 */

const GOOGLE_AUTH_BASE  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API      = 'https://www.googleapis.com/calendar/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// ─── OAuth URLs ───────────────────────────────────────────
export function getCallbackUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `${base}/api/integrations/google/callback`;
}

/** state = base64url(userId + ":" + timestamp) */
export function encodeState(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64url');
}

export function decodeState(state) {
  const raw = Buffer.from(state, 'base64url').toString();
  const colonIdx = raw.lastIndexOf(':');
  const userId    = raw.slice(0, colonIdx);
  const timestamp = Number(raw.slice(colonIdx + 1));
  if (!userId || isNaN(timestamp)) throw new Error('invalid state');
  if (Date.now() - timestamp > 10 * 60 * 1000) throw new Error('state expired');
  return userId;
}

export function buildAuthUrl(userId) {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri:  getCallbackUrl(),
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state:         encodeState(userId),
  });
  return `${GOOGLE_AUTH_BASE}?${params}`;
}

// ─── Token Exchange ───────────────────────────────────────
export async function exchangeCode(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri:  getCallbackUrl(),
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description ?? `token exchange failed (${res.status})`);
  }
  const data = await res.json();
  return {
    access_token:   data.access_token,
    refresh_token:  data.refresh_token,
    expires_in:     data.expires_in,   // seconds
    token_type:     data.token_type,
  };
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status})`);
  return await res.json(); // { access_token, expires_in }
}

export async function revokeToken(token) {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`).catch(() => {});
}

// ─── Calendar API ─────────────────────────────────────────
async function calendarFetch(accessToken, path, options = {}) {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Calendar API ${res.status}`);
  }
  return options.method === 'DELETE' ? null : res.json();
}

/** 오늘부터 N일 후까지의 이벤트 조회 */
export async function getEvents(accessToken, daysAhead = 30) {
  const now  = new Date().toISOString();
  const end  = new Date(Date.now() + daysAhead * 86400000).toISOString();
  const qs   = new URLSearchParams({
    timeMin:      now,
    timeMax:      end,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '100',
  });
  const data = await calendarFetch(accessToken, `/calendars/primary/events?${qs}`);
  return data.items ?? [];
}

/** Google 이벤트 → 우리 태스크 포맷 */
export function eventToTask(event, userId) {
  const dateStr = event.start?.date             // 종일 이벤트
    ?? event.start?.dateTime?.split('T')[0]     // 시간 이벤트
    ?? new Date().toISOString().split('T')[0];

  return {
    user_id:   userId,
    title:     event.summary ?? '(Google 이벤트)',
    date:      dateStr,
    deadline:  event.end?.date ?? event.end?.dateTime?.split('T')[0] ?? null,
    completed: false,
    priority:  'medium',
    category:  'Google Calendar',
    google_event_id: event.id,
  };
}

/** 우리 태스크 → Google Calendar 이벤트 포맷 */
export function taskToEvent(task) {
  return {
    summary:     task.title,
    start:       { date: task.date },
    end:         { date: task.deadline ?? task.date },
    description: `우선순위: ${task.priority}`,
    colorId:     task.priority === 'high' ? '11' : task.priority === 'low' ? '2' : '5',
  };
}

export async function createEvent(accessToken, task) {
  return calendarFetch(
    accessToken,
    '/calendars/primary/events',
    { method: 'POST', body: JSON.stringify(taskToEvent(task)) }
  );
}

export async function deleteEvent(accessToken, eventId) {
  return calendarFetch(
    accessToken,
    `/calendars/primary/events/${eventId}`,
    { method: 'DELETE' }
  );
}
