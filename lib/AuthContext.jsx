'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN')  router.push('/dashboard');
      if (event === 'SIGNED_OUT') router.push('/');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const signIn = useCallback(async (email, password) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) await sb.auth.signOut(); // stale 세션 제거
    return error;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) return error;
    // Confirm email OFF → session 즉시 반환 → onAuthStateChange가 처리
    if (data?.session) return null;
    // 혹시 session이 없으면 바로 signIn 시도
    const { error: signInErr } = await sb.auth.signInWithPassword({ email, password });
    return signInErr ?? null;
  }, []);

  const signOut = useCallback(() => getSupabase().auth.signOut(), []);

  /** 이메일로 6자리 인증 코드 전송 */
  const sendVerificationCode = useCallback(async (email, name) => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || '코드 전송 실패' };
    return { ok: true, devMode: data.devMode };
  }, []);

  /** 인증 코드 확인 후 유저 생성 + 로그인 */
  const verifyEmailCode = useCallback(async (email, code, password, name) => {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password, name }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || '인증 실패' };

    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (signInError) return { error: signInError.message };
    return { ok: true };
  }, []);

  /** 인증 코드 재전송 */
  const resendVerificationCode = useCallback(async (email, name) => {
    return sendVerificationCode(email, name);
  }, [sendVerificationCode]);

  /** 회원가입 후 이메일 OTP 인증 (레거시 — 로그인 화면의 "미인증 재진입" 경로용) */
  const verifyOtp = useCallback(async (email, token) => {
    const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
    return error;
  }, []);

  /** OTP 재전송 (레거시) */
  const resendOtp = useCallback(async (email) => {
    const { error } = await getSupabase().auth.resend({ type: 'signup', email });
    return error;
  }, []);

  /** 비밀번호 재설정 이메일 발송 */
  const resetPassword = useCallback(async (email) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/reset-password`,
    });
    return error;
  }, []);

  /** 새 비밀번호로 변경 (세션 있을 때) */
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    return error;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, verifyOtp, resendOtp, sendVerificationCode, verifyEmailCode, resendVerificationCode, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
