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
      if (event === 'SIGNED_IN')  router.push('/calendar');
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
