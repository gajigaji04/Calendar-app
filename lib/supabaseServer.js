/**
 * 서버 사이드 Supabase 클라이언트 (API Route / Server Component용)
 * cookies()를 통해 현재 유저 세션을 읽습니다.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
}

/** 현재 인증된 사용자 반환. 비로그인이면 null */
export async function getServerUser() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  return user ?? null;
}

/** Service Role 클라이언트 (RLS 우회 — 서버에서만 사용) */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}
