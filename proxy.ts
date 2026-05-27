import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/calendar', '/tasks', '/stats', '/teams', '/settings'];
const AUTH_ONLY  = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthOnly  = AUTH_ONLY.some(p => pathname.startsWith(p));
  if (!isProtected && !isAuthOnly) return NextResponse.next({ request });

  // supabase가 setAll에서 직접 쓸 수 있도록 response를 let으로 선언
  let res = NextResponse.next({ request });

  const cookieMethods = {
    getAll: () => request.cookies.getAll(),
    setAll: (
      cookiesToSet: { name: string; value: string; options: object }[],
      responseHeaders: Record<string, string>
    ) => {
      // 쿠키를 request와 response 양쪽에 반영 (토큰 갱신 시 필요)
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      );
      res = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
      );
      // Cache-Control 등 보안 헤더 적용
      Object.entries(responseHeaders ?? {}).forEach(([key, value]) =>
        res.headers.set(key, value)
      );
    },
  } satisfies CookieMethodsServer;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  );

  // getUser()는 서버에서 토큰을 검증하므로 getSession()보다 안전
  const { data: { user } } = await supabase.auth.getUser();

  // 미인증 → 로그인으로 리다이렉트 (next 파라미터 유지)
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 이미 로그인된 상태에서 로그인 페이지 → 대시보드
  if (isAuthOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const redirect = NextResponse.redirect(url);
    res.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)',],
};
