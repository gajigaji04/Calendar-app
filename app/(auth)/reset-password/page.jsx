'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

const inputStyle = {
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', color: '#f0f0ff', fontSize: '14px',
  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
};

function StrengthBar({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter(r => r.test(password)).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['너무 짧음', '약함', '보통', '강함'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score - 1] : 'rgba(255,255,255,0.1)',
            transition: 'background .2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '11px', color: colors[score - 1] || 'rgba(255,255,255,0.3)' }}>
        {labels[score - 1] || '비밀번호를 입력하세요'}
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [focused,    setFocused]    = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [hasSession, setHasSession] = useState(null); // null=loading

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      if (!session) setTimeout(() => router.push('/login'), 3000);
    });
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setSaving(true);
    const { error: err } = await getSupabase().auth.updateUser({ password });
    if (err) {
      setError(`오류: ${err.message}`);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    }
    setSaving(false);
  }

  const fs = (id) => ({
    ...inputStyle,
    border: `1px solid ${focused === id ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`,
    background: focused === id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.06)',
    boxShadow: focused === id ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
  });

  if (hasSession === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#070711', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin-slow .7s linear infinite' }} />
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#070711', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f0ff', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>유효하지 않은 링크입니다. 로그인 페이지로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#070711', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px 16px',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 배경 글로우 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 65%)' }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px', padding: '40px 36px',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f0f0ff', marginBottom: 6 }}>
            새 비밀번호 설정
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            안전한 새 비밀번호를 입력해주세요
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
            <p style={{ color: '#6ee7b7', fontWeight: 700 }}>비밀번호가 변경되었습니다!</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: 8 }}>대시보드로 이동 중...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                새 비밀번호
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상 입력" autoComplete="new-password"
                style={fs('pw')} onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                required
              />
              <StrengthBar password={password} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                비밀번호 확인
              </label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="비밀번호 재입력" autoComplete="new-password"
                style={{
                  ...fs('confirm'),
                  border: confirm && password !== confirm
                    ? '1px solid rgba(239,68,68,0.7)'
                    : confirm && password === confirm
                    ? '1px solid rgba(34,197,94,0.7)'
                    : fs('confirm').border,
                }}
                onFocus={() => setFocused('confirm')} onBlur={() => setFocused('')}
                required
              />
              {confirm && (
                <p style={{ fontSize: '11px', marginTop: 4, color: password === confirm ? '#6ee7b7' : '#fca5a5' }}>
                  {password === confirm ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                </p>
              )}
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '13px', color: '#fca5a5' }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={saving}
              style={{
                padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '15px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.65 : 1, fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              }}
            >
              {saving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
