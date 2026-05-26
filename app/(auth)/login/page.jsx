'use client';
import { useState } from 'react';
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

/* ── Social icon SVGs ── */
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

/* ── Social button configs ── */
const SOCIAL = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    Icon: GoogleIcon,
    bg: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.13)',
    color: '#f0f0ff',
    hoverBg: 'rgba(255,255,255,0.12)',
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    Icon: KakaoIcon,
    bg: '#FEE500',
    border: '#FEE500',
    color: '#191600',
    hoverBg: '#F5DC00',
  },
  {
    id: 'github',
    label: 'GitHub로 계속하기',
    Icon: GitHubIcon,
    bg: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.13)',
    color: '#f0f0ff',
    hoverBg: 'rgba(255,255,255,0.12)',
  },
];

/* ─────────────────────────────────
   Input 공통 스타일 (인라인)
───────────────────────────────── */
const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#f0f0ff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color .2s, background .2s, box-shadow .2s',
};

export default function LoginPage() {
  const { signIn, signUp } = useAuth();

  const [mode,          setMode]          = useState('login');
  const [name,          setName]          = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [agreeTerms,    setAgreeTerms]    = useState(false);
  const [agreePrivacy,  setAgreePrivacy]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [hoveredSocial, setHoveredSocial] = useState('');
  const [focusedField,  setFocusedField]  = useState('');

  function reset() { setError(''); setSuccess(''); }
  function toggleMode() {
    setMode(m => m === 'login' ? 'register' : 'login');
    setAgreeTerms(false);
    setAgreePrivacy(false);
    reset();
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

  async function handleSubmit(e) {
    e.preventDefault();
    reset();
    setLoading(true);

    if (mode === 'login') {
      const err = await signIn(email, password);
      if (err) setError(
        err.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : err.message
      );
    } else {
      if (!name.trim())         { setError('이름을 입력해주세요.'); setLoading(false); return; }
      if (password.length < 8)  { setError('비밀번호는 8자 이상이어야 합니다.'); setLoading(false); return; }
      if (!agreeTerms)          { setError('이용약관에 동의해주세요.'); setLoading(false); return; }
      if (!agreePrivacy)        { setError('개인정보처리방침에 동의해주세요.'); setLoading(false); return; }
      const err = await signUp(email, password, name);
      if (err) setError(err.message);
      else setSuccess('가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요! 📬');
    }
    setLoading(false);
  }

  const fieldStyle = (id) => ({
    ...inputStyle,
    border: `1px solid ${focusedField === id ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`,
    background: focusedField === id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.06)',
    boxShadow: focusedField === id ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070711',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── 배경 글로우 ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-10%', left:'50%', transform:'translateX(-50%)', width:'700px', height:'500px', background:'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'30%', width:'400px', height:'400px', background:'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 65%)' }} />
        {/* 그리드 오버레이 */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)' }} />
      </div>

      {/* ── 카드 ── */}
      <div className="animate-fade-up" style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px 36px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>

        {/* 로고 */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'28px', gap:'10px' }}>
          <Logo size={44} gradId="lgCard" />
          <div style={{ fontWeight:800, fontSize:'20px', letterSpacing:'-0.025em', color:'#f0f0ff' }}>
            Team<span style={{ color:'#818cf8' }}>Calendar</span>
          </div>
        </div>

        {/* 헤딩 */}
        <div style={{ marginBottom:'24px' }}>
          <h1 style={{ fontSize:'22px', fontWeight:800, color:'#f0f0ff', marginBottom:'6px', letterSpacing:'-0.02em' }}>
            {mode === 'login' ? '다시 오셨군요 👋' : '계정 만들기'}
          </h1>
          <p style={{ fontSize:'13.5px', color:'rgba(255,255,255,0.42)' }}>
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button onClick={toggleMode} style={{ background:'none', border:'none', color:'#818cf8', fontWeight:700, fontSize:'13.5px', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>

        {/* ── 소셜 버튼 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
          {SOCIAL.map(({ id, label, Icon, bg, border, color, hoverBg }) => (
            <button
              key={id}
              onClick={() => handleSocial(id)}
              disabled={!!socialLoading}
              onMouseEnter={() => setHoveredSocial(id)}
              onMouseLeave={() => setHoveredSocial('')}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '11px 16px',
                background: hoveredSocial === id ? hoverBg : bg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                color,
                fontSize: '14px', fontWeight: 600,
                cursor: socialLoading ? 'not-allowed' : 'pointer',
                opacity: socialLoading && socialLoading !== id ? 0.55 : 1,
                transition: 'background .15s, opacity .15s',
                fontFamily: 'inherit',
              }}
            >
              {socialLoading === id
                ? <span style={{ width:'16px', height:'16px', border:`2px solid ${color}`, borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin-slow .7s linear infinite' }} />
                : <Icon />
              }
              {label}
            </button>
          ))}
        </div>

        {/* ── 구분선 ── */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', fontWeight:600, letterSpacing:'0.04em' }}>또는 이메일로 계속</span>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.08)' }} />
        </div>

        {/* ── 이메일 폼 ── */}
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

          {mode === 'register' && (
            <div>
              <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.45)', marginBottom:'7px', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                이름
              </label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="홍길동" autoComplete="name"
                style={fieldStyle('name')}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
              />
            </div>
          )}

          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.45)', marginBottom:'7px', letterSpacing:'0.06em', textTransform:'uppercase' }}>
              이메일
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="hello@example.com" autoComplete="email"
              style={fieldStyle('email')}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              required
            />
          </div>

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'7px' }}>
              <label style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                비밀번호
              </label>
              {mode === 'login' && (
                <button type="button" style={{ background:'none', border:'none', color:'#818cf8', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
                  비밀번호 찾기
                </button>
              )}
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '비밀번호 입력' : '8자 이상 입력'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={fieldStyle('pw')}
              onFocus={() => setFocusedField('pw')}
              onBlur={() => setFocusedField('')}
              required
            />
          </div>

          {/* ── 약관 동의 (회원가입만) ── */}
          {mode === 'register' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', padding:'16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
                <div
                  onClick={() => setAgreeTerms(v => !v)}
                  style={{
                    width:'18px', height:'18px', flexShrink:0, borderRadius:'5px', cursor:'pointer',
                    background: agreeTerms ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                    border: agreeTerms ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .15s',
                  }}>
                  {agreeTerms && <span style={{ color:'#fff', fontSize:'11px', fontWeight:900, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', lineHeight:1.4 }}>
                  <Link href="/terms" target="_blank" style={{ color:'#818cf8', fontWeight:700, textDecoration:'none' }}>이용약관</Link>
                  {' '}에 동의합니다 <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'11px' }}>(필수)</span>
                </span>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
                <div
                  onClick={() => setAgreePrivacy(v => !v)}
                  style={{
                    width:'18px', height:'18px', flexShrink:0, borderRadius:'5px', cursor:'pointer',
                    background: agreePrivacy ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                    border: agreePrivacy ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'all .15s',
                  }}>
                  {agreePrivacy && <span style={{ color:'#fff', fontSize:'11px', fontWeight:900, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.55)', lineHeight:1.4 }}>
                  <Link href="/privacy" target="_blank" style={{ color:'#818cf8', fontWeight:700, textDecoration:'none' }}>개인정보처리방침</Link>
                  {' '}에 동의합니다 <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'11px' }}>(필수)</span>
                </span>
              </label>
            </div>
          )}

          {/* 에러 / 성공 */}
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'#fca5a5' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'10px', padding:'10px 14px', fontSize:'13px', color:'#6ee7b7' }}>
              <span>✓</span><span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!socialLoading}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px', fontWeight: 800,
              cursor: loading || socialLoading ? 'not-allowed' : 'pointer',
              opacity: loading || socialLoading ? 0.65 : 1,
              transition: 'opacity .15s, transform .1s',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              fontFamily: 'inherit',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        {/* 하단 링크 */}
        <div style={{ marginTop:'24px', textAlign:'center' }}>
          <Link href="/" style={{ fontSize:'12.5px', color:'rgba(255,255,255,0.3)', textDecoration:'none', transition:'color .2s' }}>
            ← 홈으로 돌아가기
          </Link>
        </div>

        <div style={{ marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
          <p style={{ fontSize:'11.5px', color:'rgba(255,255,255,0.25)', lineHeight:1.6 }}>
            가입하면{' '}
            <a href="#" style={{ color:'rgba(255,255,255,0.4)', textDecoration:'underline' }}>이용약관</a>
            {' '}및{' '}
            <a href="#" style={{ color:'rgba(255,255,255,0.4)', textDecoration:'underline' }}>개인정보처리방침</a>
            에 동의한 것으로 간주합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
