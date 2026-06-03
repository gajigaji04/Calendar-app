'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { getSupabase } from '@/lib/supabase';

/* ── Logo ── */
function Logo({ size = 36, gradId = 'loginLg' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <rect x="8" y="14" width="24" height="1.5" rx=".75" fill="rgba(255,255,255,0.28)" />
      <rect x="12.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="24.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="8"    y="19.5" width="13"  height="3" rx="1.5" fill="rgba(255,255,255,0.88)" />
      <rect x="23.5" y="19.5" width="8.5" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="8"    y="25.5" width="8"   height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="18.5" y="25.5" width="13.5" height="3" rx="1.5" fill="rgba(255,255,255,0.65)" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── 소셜 아이콘 ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
      <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.88 1.8 5.41 4.5 6.87l-.87 3.24c-.07.26.2.48.44.35L10.22 19c.58.08 1.18.13 1.78.13 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"/>
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

const SOCIAL = [
  { id: 'google', label: 'Google로 계속하기', Icon: GoogleIcon, bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.13)', color: '#f0f0ff', hoverBg: 'rgba(255,255,255,0.12)' },
  { id: 'kakao',  label: '카카오로 계속하기', Icon: KakaoIcon,  bg: '#FEE500', border: '#FEE500', color: '#191600', hoverBg: '#F5DC00' },
  { id: 'github', label: 'GitHub로 계속하기', Icon: GitHubIcon, bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.13)', color: '#f0f0ff', hoverBg: 'rgba(255,255,255,0.12)' },
];

const inputBase = {
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', color: '#f0f0ff', fontSize: '14px',
  outline: 'none', transition: 'border-color .2s, background .2s, box-shadow .2s',
};

/* ── 비밀번호 강도 바 ── */
function StrengthBar({ password }) {
  if (!password) return null;
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['너무 짧음', '약함', '보통', '강함'];
  return (
    <div style={{ marginTop: 5 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score-1] : 'rgba(255,255,255,0.1)', transition: 'background .2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '11px', color: colors[score-1] || 'rgba(255,255,255,0.3)', marginTop: 3, display: 'block' }}>{labels[score-1] || ''}</span>
    </div>
  );
}

/* ── OTP 입력 컴포넌트 ── */
function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  function handleChange(i, v) {
    const clean = v.replace(/\D/, '');
    if (!clean && !v) return;
    const arr = [...digits];
    arr[i] = clean.slice(-1);
    onChange(arr.join(''));
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      const arr = [...digits]; arr[i - 1] = '';
      onChange(arr.join(''));
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text) { onChange(text.padEnd(6, '').slice(0, 6)); inputs.current[Math.min(text.length, 5)]?.focus(); }
    e.preventDefault();
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: '20px', fontWeight: 700,
            background: digits[i] ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${digits[i] ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 10, color: '#f0f0ff', outline: 'none',
            transition: 'all .15s', fontFamily: 'monospace',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   메인 페이지
═══════════════════════════════════════ */
export default function LoginPage() {
  const { signIn, sendVerificationCode, verifyEmailCode, resendVerificationCode, resetPassword } = useAuth();

  // mode: 'login' | 'register' | 'verify' | 'forgot'
  const [mode,            setMode]            = useState('login');
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [pwConfirm,       setPwConfirm]       = useState('');
  const [otp,             setOtp]             = useState('');
  const [pendingEmail,    setPendingEmail]    = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [pendingName,     setPendingName]     = useState('');
  const [agreeTerms,      setAgreeTerms]      = useState(false);
  const [agreePrivacy,    setAgreePrivacy]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [socialLoading,   setSocialLoading]   = useState('');
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [focusedField,    setFocusedField]    = useState('');
  const [hoveredSocial,   setHoveredSocial]   = useState('');
  const [resendCooldown,  setResendCooldown]  = useState(0);
  const [codeExpiry,      setCodeExpiry]      = useState(0); // 남은 초

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (codeExpiry <= 0) return;
    const id = setTimeout(() => setCodeExpiry(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [codeExpiry]);

  function reset() { setError(''); setSuccess(''); }

  function goMode(m) { reset(); setOtp(''); setMode(m); }

  function fieldStyle(id) {
    return {
      ...inputBase,
      border: `1px solid ${focusedField === id ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`,
      background: focusedField === id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.06)',
      boxShadow: focusedField === id ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    };
  }

  async function handleSocial(provider) {
    reset();
    setSocialLoading(provider);
    const { error: err } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setSocialLoading(''); }
  }

  /* ── 로그인 ── */
  async function handleLogin(e) {
    e.preventDefault(); reset(); setLoading(true);
    const err = await signIn(email, password);
    if (err) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('__INVALID_CREDENTIALS__');
      } else if (msg.includes('Email not confirmed')) {
        setPendingEmail(email);
        setError('이메일 인증이 완료되지 않았습니다. 인증 코드를 확인해주세요.');
        setTimeout(() => goMode('verify'), 1500);
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  }

  /* ── 회원가입 ── */
  async function handleRegister(e) {
    e.preventDefault(); reset();
    if (!name.trim())           { setError('이름을 입력해주세요.'); return; }
    if (password.length < 8)    { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (password !== pwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!agreeTerms)            { setError('이용약관에 동의해주세요.'); return; }
    if (!agreePrivacy)          { setError('개인정보처리방침에 동의해주세요.'); return; }
    setLoading(true);
    const result = await sendVerificationCode(email, name);
    if (result.error) {
      setError(result.error);
    } else {
      setPendingEmail(email);
      setPendingPassword(password);
      setPendingName(name);
      setOtp('');
      setMode('verify');
      setResendCooldown(60);
      setCodeExpiry(300);
      if (result.devMode) {
        setSuccess('SMTP 미설정 — 서버 콘솔에서 인증 코드를 확인하세요.');
      }
    }
    setLoading(false);
  }

  /* ── 인증 코드 확인 ── */
  async function handleVerify(e) {
    e.preventDefault(); reset();
    if (otp.replace(/\s/g, '').length !== 6) {
      setError('6자리 인증 코드를 모두 입력해주세요.'); return;
    }
    setLoading(true);
    const result = await verifyEmailCode(pendingEmail, otp, pendingPassword, pendingName);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('인증 완료! 대시보드로 이동합니다 🎉');
    }
    setLoading(false);
  }

  /* ── 코드 재전송 ── */
  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true); reset(); setOtp('');
    const result = await resendVerificationCode(pendingEmail, pendingName);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('새 인증 코드를 발송했습니다. 메일함을 확인하세요.');
      setResendCooldown(60);
      setCodeExpiry(300);
    }
    setLoading(false);
  }

  /* ── 비밀번호 찾기 ── */
  async function handleForgot(e) {
    e.preventDefault(); reset();
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return; }
    setLoading(true);
    const err = await resetPassword(email);
    if (err) setError(err.message);
    else setSuccess('비밀번호 재설정 이메일을 보냈습니다. 메일함을 확인해주세요 📬');
    setLoading(false);
  }

  /* ── 공통 렌더링 헬퍼 ── */
  function Feedback() {
    if (error === '__INVALID_CREDENTIALS__') {
      return (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 14px', fontSize: '13px', color: '#fca5a5' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ 잘못된 이메일 또는 비밀번호입니다.</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            아직 계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={() => { goMode('register'); setEmail(email); }}
              style={{ color: '#818cf8', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: 'inherit' }}
            >
              회원가입 후 진행해주세요 →
            </button>
          </div>
        </div>
      );
    }
    if (error) return (
      <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '13px', color: '#fca5a5' }}>
        <span>⚠</span><span>{error}</span>
      </div>
    );
    if (success) return (
      <div style={{ display: 'flex', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: '13px', color: '#6ee7b7' }}>
        <span>✓</span><span>{success}</span>
      </div>
    );
    return null;
  }

  function SubmitBtn({ label, loadingLabel }) {
    return (
      <button
        type="submit"
        disabled={loading || !!socialLoading}
        style={{
          width: '100%', padding: '13px',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none', borderRadius: '12px', color: '#fff',
          fontSize: '15px', fontWeight: 800,
          cursor: loading || socialLoading ? 'not-allowed' : 'pointer',
          opacity: loading || socialLoading ? 0.65 : 1,
          transition: 'opacity .15s', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        }}
      >
        {loading ? loadingLabel : label}
      </button>
    );
  }

  const MODE_CONFIG = {
    login:    { emoji: '👋', title: '다시 오셨군요',   sub: null },
    register: { emoji: '✨', title: '계정 만들기',     sub: null },
    verify:   { emoji: '📨', title: '이메일 인증',      sub: `${pendingEmail || '이메일'}로 발송된 6자리 코드를 입력하세요` },
    forgot:   { emoji: '🔐', title: '비밀번호 찾기',   sub: '가입 시 사용한 이메일을 입력하면 재설정 링크를 보내드려요' },
  };
  const { emoji, title, sub } = MODE_CONFIG[mode];

  return (
    <div style={{
      minHeight: '100vh', background: '#070711',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 배경 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '500px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '30%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)' }} />
      </div>

      {/* 카드 */}
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px', padding: '40px 36px',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>

        {/* 로고 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, gap: 10 }}>
          <Logo size={44} gradId="lgCard" />
          <div style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.025em', color: '#f0f0ff' }}>
            Team<span style={{ color: '#818cf8' }}>Calendar</span>
          </div>
        </div>

        {/* 헤딩 */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f0f0ff', marginBottom: 6, letterSpacing: '-0.02em' }}>
            {emoji} {title}
          </h1>
          {sub && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{sub}</p>}
          {!sub && (
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.42)' }}>
              {mode === 'login'
                ? <><span>계정이 없으신가요? </span><button onClick={() => goMode('register')} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>회원가입</button></>
                : <><span>이미 계정이 있으신가요? </span><button onClick={() => goMode('login')} style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>로그인</button></>
              }
            </p>
          )}
        </div>

        {/* ═══ LOGIN ═══ */}
        {mode === 'login' && (
          <>
            {/* 소셜 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {SOCIAL.map(({ id, label, Icon, bg, border, color, hoverBg }) => (
                <button key={id} onClick={() => handleSocial(id)} disabled={!!socialLoading}
                  onMouseEnter={() => setHoveredSocial(id)} onMouseLeave={() => setHoveredSocial('')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', background: hoveredSocial === id ? hoverBg : bg, border: `1px solid ${border}`, borderRadius: 12, color, fontSize: 14, fontWeight: 600, cursor: socialLoading ? 'not-allowed' : 'pointer', opacity: socialLoading && socialLoading !== id ? 0.55 : 1, transition: 'background .15s', fontFamily: 'inherit' }}>
                  {socialLoading === id
                    ? <span style={{ width: 16, height: 16, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin-slow .7s linear infinite' }} />
                    : <Icon />}
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.04em' }}>또는 이메일로 계속</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이메일</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" autoComplete="email" style={fieldStyle('email')} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField('')} required />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호</label>
                  <button type="button" onClick={() => goMode('forgot')} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    비밀번호 찾기
                  </button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 입력" autoComplete="current-password" style={fieldStyle('pw')} onFocus={() => setFocusedField('pw')} onBlur={() => setFocusedField('')} required />
              </div>
              <Feedback />
              <SubmitBtn label="로그인" loadingLabel="로그인 중..." />
            </form>
          </>
        )}

        {/* ═══ REGISTER ═══ */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" autoComplete="name" style={fieldStyle('name')} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" autoComplete="email" style={fieldStyle('email')} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField('')} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" autoComplete="new-password" style={fieldStyle('pw')} onFocus={() => setFocusedField('pw')} onBlur={() => setFocusedField('')} required />
              <StrengthBar password={password} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>비밀번호 확인</label>
              <input
                type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                placeholder="비밀번호 재입력" autoComplete="new-password"
                style={{
                  ...fieldStyle('confirm'),
                  ...(pwConfirm && password !== pwConfirm ? { border: '1px solid rgba(239,68,68,0.6)' } : {}),
                  ...(pwConfirm && password === pwConfirm ? { border: '1px solid rgba(34,197,94,0.6)' } : {}),
                }}
                onFocus={() => setFocusedField('confirm')} onBlur={() => setFocusedField('')}
              />
              {pwConfirm && (
                <p style={{ fontSize: 11, marginTop: 4, color: password === pwConfirm ? '#6ee7b7' : '#fca5a5' }}>
                  {password === pwConfirm ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                </p>
              )}
            </div>

            {/* 약관 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
              {[
                { state: agreeTerms, set: setAgreeTerms, label: '이용약관', href: '/terms' },
                { state: agreePrivacy, set: setAgreePrivacy, label: '개인정보처리방침', href: '/privacy' },
              ].map(({ state, set, label, href }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => set(v => !v)} style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, cursor: 'pointer', background: state ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)', border: state ? 'none' : '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                    {state && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                    <Link href={href} target="_blank" style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}>{label}</Link>에 동의합니다{' '}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>(필수)</span>
                  </span>
                </label>
              ))}
            </div>

            <Feedback />
            <SubmitBtn label="가입하기" loadingLabel="처리 중..." />
          </form>
        )}

        {/* ═══ VERIFY ═══ */}
        {mode === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 발송 안내 */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{pendingEmail}</span> 으로<br/>
              6자리 인증 코드를 발송했습니다.
            </div>

            {/* OTP 입력 */}
            <div style={{ textAlign: 'center' }}>
              <OtpInput value={otp} onChange={setOtp} />

              {/* 만료 타이머 */}
              <div style={{ marginTop: 12, fontSize: 12, color: codeExpiry > 60 ? 'rgba(255,255,255,0.3)' : codeExpiry > 0 ? '#f97316' : '#ef4444' }}>
                {codeExpiry > 0
                  ? `유효 시간 ${Math.floor(codeExpiry / 60)}:${String(codeExpiry % 60).padStart(2, '0')} 남음`
                  : '⚠ 코드가 만료되었습니다. 재전송해주세요.'}
              </div>
            </div>

            <Feedback />

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SubmitBtn label="인증 완료" loadingLabel="확인 중..." />
            </form>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13 }}>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'rgba(255,255,255,0.3)' : '#818cf8', fontWeight: 600, cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}
              >
                {resendCooldown > 0 ? `재전송 (${resendCooldown}s)` : '코드 재전송'}
              </button>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <button
                type="button"
                onClick={() => { goMode('login'); setPendingPassword(''); setPendingName(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}
              >
                로그인으로 돌아가기
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              메일이 안 보이면 스팸함을 확인해주세요
            </p>
          </div>
        )}

        {/* ═══ FORGOT ═══ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>가입 이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@example.com" autoComplete="email" style={fieldStyle('email')} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField('')} required />
            </div>
            <Feedback />
            <SubmitBtn label="재설정 메일 보내기" loadingLabel="전송 중..." />
            <button type="button" onClick={() => goMode('login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'center', padding: 4 }}>
              ← 로그인으로 돌아가기
            </button>
          </form>
        )}

        {/* 하단 링크 */}
        {(mode === 'login' || mode === 'register') && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
              ← 홈으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
