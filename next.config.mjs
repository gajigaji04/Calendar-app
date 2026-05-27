/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content-Security-Policy
 * - 'unsafe-inline': Next.js 인라인 스타일 + FOUC 방지 인라인 스크립트에 필요
 * - 'unsafe-eval' : 개발(HMR) 시에만 허용, 프로덕션에서는 제거
 * - upgrade-insecure-requests: 프로덕션에서 HTTP 서브리소스를 HTTPS로 자동 업그레이드
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "font-src 'self' https://cdnjs.cloudflare.com data:",
  "img-src 'self' data: blob: https:",
  // Supabase REST / Realtime(WebSocket)
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // 소셜 로그인 팝업 허용 (OAuth 리다이렉트 플로우용)
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
];

const SECURITY_HEADERS = [
  /**
   * HSTS — 브라우저에게 앞으로 이 사이트는 HTTPS만 사용하도록 지시
   * max-age=63072000 = 2년 / preload 목록 등록 가능 (https://hstspreload.org)
   * 개발 로컬에서는 효과 없음 (HTTPS가 아니기 때문)
   */
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // MIME 스니핑 공격 차단 (Content-Type 위조 방지)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 클릭재킹(Clickjacking) 방어
  { key: 'X-Frame-Options', value: 'DENY' },
  // 레거시 브라우저 XSS 필터 활성화
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // 리퍼러 헤더: 같은 출처 → full URL / 다른 출처 → origin 만 전달
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 불필요한 브라우저 기능 비활성화
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // 콘텐츠 보안 정책
  { key: 'Content-Security-Policy', value: CSP_DIRECTIVES.join('; ') },
  /**
   * COOP: 다른 출처가 window 참조를 통해 이 페이지에 접근하는 것을 제한
   * same-origin-allow-popups: 소셜 로그인 팝업(OAuth)이 정상 동작하도록 허용
   */
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // 이 사이트의 리소스를 다른 출처에서 embed하는 것을 차단
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // DNS 프리페치 허용 (성능)
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
