import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Open Redirect 방어:
 * `next` 파라미터가 같은 출처(origin) 내의 경로인지 검증합니다.
 * //evil.com, http://evil.com 등 외부 URL로의 이동을 차단합니다.
 */
function safeRedirectPath(next: string | null): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (/^https?:/i.test(next)) return '/dashboard';
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const cookieStore = await cookies();

    const cookieMethods = {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: Parameters<NonNullable<CookieMethodsServer['setAll']>>[0]) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
    } satisfies CookieMethodsServer;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieMethods }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
