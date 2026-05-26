import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PROTECTED = ['/calendar', '/tasks'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // supabase가 setAll에서 직접 쓸 수 있도록 response를 let으로 선언
  let res = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, responseHeaders) => {
          // 쿠키를 request와 response 양쪽에 반영 (토큰 갱신 시 필요)
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          );
          res = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
          // Cache-Control 등 보안 헤더 적용
          Object.entries(responseHeaders ?? {}).forEach(([key, value]) =>
            res.headers.set(key, value)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 보호 경로 → 미인증이면 /login
  if (PROTECTED.some(p => pathname.startsWith(p)) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 / 또는 /login 방문 → /calendar
  // 갱신된 쿠키를 redirect에도 복사
  if ((pathname === '/' || pathname === '/login') && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/calendar';
    const redirect = NextResponse.redirect(url);
    res.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|auth/).*)'],
};
