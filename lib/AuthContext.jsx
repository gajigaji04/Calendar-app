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
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const { error } = await getSupabase().auth.signUp({
      email, password,
      options: { data: { name } },
    });
    return error;
  }, []);

  const signOut = useCallback(() => getSupabase().auth.signOut(), []);

  /** 회원가입 후 이메일 OTP 인증 */
  const verifyOtp = useCallback(async (email, token) => {
    const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
    return error;
  }, []);

  /** OTP 재전송 */
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, verifyOtp, resendOtp, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
