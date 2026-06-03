/**
 * 인메모리 Rate Limiter
 * - 서버 재시작 시 리셋 (외부 저장소 불필요)
 * - 기본: IP당 1분에 10회
 */

const store = new Map(); // ip → { count, resetAt }
const WINDOW_MS   = 60_000; // 1분
const MAX_REQUESTS = 10;

function getIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function pruneExpired() {
  const now = Date.now();
  for (const [ip, entry] of store) {
    if (entry.resetAt < now) store.delete(ip);
  }
}

/**
 * @param {Request} request
 * @param {{ limit?: number, windowMs?: number }} options
 * @returns {Response | null}  null이면 통과, Response이면 429 반환
 */
export function rateLimit(request, { limit = MAX_REQUESTS, windowMs = WINDOW_MS } = {}) {
  // 약 1% 확률로 만료 항목 정리 (메모리 누수 방지)
  if (Math.random() < 0.01) pruneExpired();

  const ip  = getIp(request);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  entry.count++;
  return null;
}
