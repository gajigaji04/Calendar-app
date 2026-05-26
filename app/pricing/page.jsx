'use client';
import { useState } from 'react';
import Link from 'next/link';

const TEXT  = '#f0f0ff';
const MUTED = 'rgba(255,255,255,0.45)';
const DIM   = 'rgba(255,255,255,0.22)';
const CARD  = 'rgba(255,255,255,0.035)';
const BORDER = 'rgba(255,255,255,0.08)';

function Logo({ size = 36, gradId = 'lg0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <rect x="8" y="14" width="24" height="1.5" rx=".75" fill="rgba(255,255,255,0.28)" />
      <rect x="12.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="24.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="8"    y="19.5" width="13"   height="3" rx="1.5" fill="rgba(255,255,255,0.88)" />
      <rect x="23.5" y="19.5" width="8.5"  height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="8"    y="25.5" width="8"    height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
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

const PLANS = [
  {
    id: 'free',
    name: '무료',
    desc: '개인 일정 관리를 시작하세요',
    monthly: 0,
    yearly: 0,
    highlight: false,
    badge: null,
    cta: '무료로 시작',
    ctaHref: '/login',
    features: [
      { label: '개인 캘린더', ok: true },
      { label: '할일 50개/월', ok: true },
      { label: '월간 뷰', ok: true },
      { label: '기본 알림', ok: true },
      { label: '주간·일간 뷰', ok: false },
      { label: '마감 전 알림', ok: false },
      { label: '반복 일정', ok: false },
      { label: '팀 기능', ok: false },
    ],
  },
  {
    id: 'pro',
    name: '프로',
    desc: '혼자 쓰는 파워 유저를 위해',
    monthly: 6900,
    yearly: 5750,
    highlight: true,
    badge: '가장 인기',
    cta: '프로 시작하기',
    ctaHref: null,
    features: [
      { label: '무제한 할일', ok: true },
      { label: '월·주·일 뷰', ok: true },
      { label: '1시간·30분 전 알림', ok: true },
      { label: '반복 일정', ok: true },
      { label: '캘린더 내보내기(ICS)', ok: true },
      { label: '우선 고객지원', ok: true },
      { label: '팀 기능', ok: false },
      { label: '팀원 초대', ok: false },
    ],
  },
  {
    id: 'team',
    name: '팀',
    desc: '2인 이상 팀 협업이 필요할 때',
    monthly: 12900,
    yearly: 10750,
    highlight: false,
    badge: null,
    cta: '팀 플랜 시작',
    ctaHref: null,
    features: [
      { label: '프로 기능 전체', ok: true },
      { label: '팀 캘린더 공유', ok: true },
      { label: '팀원 최대 20명 초대', ok: true },
      { label: '팀 이벤트 & RSVP', ok: true },
      { label: '팀 그룹 채팅', ok: true },
      { label: '관리자 권한 관리', ok: true },
      { label: '우선·전담 고객지원', ok: true },
      { label: '사용 통계 대시보드', ok: true },
    ],
  },
];

const TABLE_ROWS = [
  ['개인 캘린더',    true,      true,       true],
  ['할일 관리',      '50개/월', '무제한',   '무제한'],
  ['캘린더 뷰',      '월간',    '월·주·일', '월·주·일'],
  ['마감 전 알림',   false,     true,       true],
  ['반복 일정',      false,     true,       true],
  ['내보내기(ICS)', false,     true,       true],
  ['팀 캘린더 공유', false,     false,      true],
  ['팀원 초대',      false,     false,      '최대 20명'],
  ['RSVP 관리',      false,     false,      true],
  ['팀 채팅',        false,     false,      true],
  ['고객지원',       '기본',    '우선',     '전담'],
];

const FAQ = [
  { q: '무료 플랜은 언제까지 무료인가요?', a: '영구 무료입니다. 언제든 업그레이드할 수 있고, 무료 플랜은 계속 유지됩니다.' },
  { q: '결제는 어떻게 하나요?', a: '토스페이먼츠를 통해 카드·계좌이체로 결제할 수 있습니다. 곧 오픈 예정입니다.' },
  { q: '언제든 해지할 수 있나요?', a: '네, 언제든 해지할 수 있습니다. 해지 시 남은 기간은 사용 가능하며 환불 정책에 따라 처리됩니다.' },
  { q: '팀 플랜은 몇 명부터 시작할 수 있나요?', a: '2명부터 최대 20명까지 사용할 수 있습니다. 인원수에 따라 총 금액이 계산됩니다.' },
  { q: '데이터는 안전한가요?', a: 'Supabase의 Row Level Security로 내 데이터는 나만 볼 수 있습니다. 데이터는 암호화되어 저장됩니다.' },
];

function fmt(n) {
  return n === 0 ? '무료' : `₩${n.toLocaleString('ko-KR')}`;
}

export default function PricingPage() {
  const [yearly,  setYearly]  = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  function handleBuy(plan) {
    alert(`${plan.name} 플랜 결제 기능은 곧 오픈됩니다! 🚀`);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070711',
      color: TEXT,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      overflowX: 'hidden',
    }}>

      {/* ── 배경 글로우 ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div className="animate-glow" style={{ position:'absolute', top:'-15%', left:'50%', transform:'translateX(-50%)', width:'900px', height:'700px', background:'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', bottom:'0', right:'-5%', width:'500px', height:'500px', background:'radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize:'72px 72px', maskImage:'radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)' }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', display:'flex', alignItems:'center', background:'rgba(7,7,17,0.8)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full flex items-center justify-between">
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
            <Logo size={32} gradId="pNavLg" />
            <span style={{ fontWeight:800, fontSize:'17px', letterSpacing:'-0.025em', color:TEXT }}>
              Team<span style={{ color:'#818cf8' }}>Calendar</span>
            </span>
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <Link href="/login" style={{ fontSize:'14px', color:MUTED, padding:'7px 12px', borderRadius:'8px', textDecoration:'none' }}>
              로그인
            </Link>
            <Link href="/login" style={{ fontSize:'13px', fontWeight:700, color:'#fff', padding:'8px 18px', borderRadius:'10px', textDecoration:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 4px 20px rgba(99,102,241,0.45)' }}>
              무료로 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{ position:'relative', zIndex:1, paddingTop:'112px', paddingBottom:'96px' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-14">

          {/* ── 헤딩 ── */}
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'999px', padding:'5px 14px', marginBottom:'16px', fontSize:'12px', fontWeight:700, color:'#6ee7b7', letterSpacing:'0.04em' }}>
              ✦&nbsp; 요금제
            </div>
            <h1 style={{ fontSize:'clamp(1.9rem,4vw,3rem)', fontWeight:900, letterSpacing:'-0.035em', marginBottom:'14px' }}>
              합리적인 가격으로 시작하세요
            </h1>
            <p style={{ fontSize:'16px', color:MUTED, marginBottom:'36px' }}>
              무료로 시작하고, 필요할 때 언제든 업그레이드하세요.
            </p>

            {/* 월간/연간 토글 */}
            <div style={{ display:'inline-flex', alignItems:'center', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'999px', padding:'4px' }}>
              <button
                onClick={() => setYearly(false)}
                style={{ padding:'7px 20px', borderRadius:'999px', fontSize:'13px', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', transition:'all .2s',
                  background: !yearly ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: !yearly ? '#818cf8' : MUTED,
                  boxShadow: !yearly ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                }}>
                월간 결제
              </button>
              <button
                onClick={() => setYearly(true)}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 20px', borderRadius:'999px', fontSize:'13px', fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', transition:'all .2s',
                  background: yearly ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: yearly ? '#818cf8' : MUTED,
                  boxShadow: yearly ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                }}>
                연간 결제
                <span style={{ background:'rgba(16,185,129,0.2)', color:'#6ee7b7', fontSize:'10px', fontWeight:800, padding:'2px 7px', borderRadius:'999px' }}>
                  2개월 무료
                </span>
              </button>
            </div>
          </div>

          {/* ── 플랜 카드 ── */}
          <div className="grid sm:grid-cols-3 gap-6" style={{ marginBottom:'80px' }}>
            {PLANS.map(plan => {
              const price = yearly ? plan.yearly : plan.monthly;

              if (plan.highlight) return (
                <div key={plan.id} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'1.5px', borderRadius:'22px', boxShadow:'0 0 56px rgba(99,102,241,0.32)', position:'relative' }}>
                  {plan.badge && (
                    <div style={{ position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#f59e0b,#f97316)', color:'#fff', fontSize:'11px', fontWeight:800, padding:'4px 14px', borderRadius:'999px', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ background:'#0f0f20', borderRadius:'21px', padding:'32px 28px', height:'100%', display:'flex', flexDirection:'column' }}>
                    <PlanBody plan={plan} price={price} yearly={yearly} dark onBuy={handleBuy} />
                  </div>
                </div>
              );

              return (
                <div key={plan.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:'22px', padding:'32px 28px', display:'flex', flexDirection:'column' }}>
                  {plan.badge && (
                    <div style={{ position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#f59e0b,#f97316)', color:'#fff', fontSize:'11px', fontWeight:800, padding:'4px 14px', borderRadius:'999px', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <PlanBody plan={plan} price={price} yearly={yearly} onBuy={handleBuy} />
                </div>
              );
            })}
          </div>

          <p style={{ textAlign:'center', marginTop:'-56px', marginBottom:'80px', fontSize:'13px', color:DIM }}>
            연간 결제 시 2개월 무료 · 언제든 해지 가능 · 신용카드 불필요 (무료)
          </p>

          {/* ── 기능 비교 표 ── */}
          <div style={{ marginBottom:'80px' }}>
            <h2 style={{ fontSize:'clamp(1.4rem,2.5vw,1.9rem)', fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:'32px' }}>
              플랜 비교
            </h2>
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:'18px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13.5px' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
                    <th style={{ textAlign:'left', padding:'16px 24px', color:MUTED, fontWeight:600, width:'40%' }}>기능</th>
                    {PLANS.map(p => (
                      <th key={p.id} style={{ padding:'16px 12px', fontWeight:800, textAlign:'center',
                        color: p.highlight ? '#818cf8' : TEXT }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map(([label, ...vals], i) => (
                    <tr key={label} style={{ borderBottom: i < TABLE_ROWS.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                      <td style={{ padding:'13px 24px', color:MUTED }}>{label}</td>
                      {vals.map((v, j) => (
                        <td key={j} style={{ padding:'13px 12px', textAlign:'center' }}>
                          {v === true  ? <span style={{ color:'#6ee7b7', fontWeight:900 }}>✓</span>
                          : v === false ? <span style={{ color:'rgba(255,255,255,0.15)' }}>—</span>
                          : <span style={{ color:TEXT, fontWeight:600, fontSize:'12px' }}>{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="max-w-2xl mx-auto">
            <h2 style={{ fontSize:'clamp(1.4rem,2.5vw,1.9rem)', fontWeight:900, letterSpacing:'-0.03em', textAlign:'center', marginBottom:'32px' }}>
              자주 묻는 질문
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {FAQ.map((item, i) => (
                <div key={i} style={{ background:CARD, border:`1px solid ${openFaq === i ? 'rgba(99,102,241,0.35)' : BORDER}`, borderRadius:'14px', overflow:'hidden', transition:'border-color .2s' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'none', border:'none', color:TEXT, fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', textAlign:'left', gap:'12px' }}>
                    <span>{item.q}</span>
                    <span style={{ flexShrink:0, color:MUTED, fontSize:'12px', transition:'transform .2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding:'0 20px 16px', fontSize:'13.5px', color:MUTED, lineHeight:1.7, borderTop:`1px solid rgba(255,255,255,0.05)`, paddingTop:'14px' }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'28px', paddingBottom:'28px', position:'relative', zIndex:1 }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:'8px', textDecoration:'none' }}>
            <Logo size={22} gradId="pFootLg" />
            <span style={{ fontWeight:800, fontSize:'14px', color:TEXT }}>Team<span style={{ color:'#818cf8' }}>Calendar</span></span>
          </Link>
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', justifyContent:'center' }}>
            {[['홈','/'],['로그인','/login'],['이용약관','/terms'],['개인정보처리방침','/privacy']].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:'13px', color:DIM, textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
          <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>© 2026 TeamCalendar</p>
        </div>
      </footer>
    </div>
  );
}

function PlanBody({ plan, price, yearly, dark = false, onBuy }) {
  const t = dark ? '#f0f0ff' : TEXT;
  const m = dark ? 'rgba(255,255,255,0.5)' : MUTED;
  const d = dark ? 'rgba(255,255,255,0.25)' : DIM;

  return (
    <>
      <div style={{ fontSize:'11px', fontWeight:800, color:d, marginBottom:'4px', letterSpacing:'0.08em', textTransform:'uppercase' }}>{plan.name}</div>
      <div style={{ fontSize:'13px', color:m, marginBottom:'16px' }}>{plan.desc}</div>

      <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'4px' }}>
        <span style={{ fontSize:'38px', fontWeight:900, letterSpacing:'-0.04em', color:t }}>
          {fmt(price)}
        </span>
        {price > 0 && <span style={{ fontSize:'13px', color:m }}>/월{plan.id === 'team' ? '/인' : ''}</span>}
      </div>
      <div style={{ fontSize:'12px', color:m, marginBottom:'24px', minHeight:'18px' }}>
        {price === 0 ? '영구 무료' : yearly ? `연 ${(price * 10).toLocaleString('ko-KR')}원 청구 · 17% 할인` : ''}
      </div>

      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', flex:1, marginBottom:'24px' }}>
        {plan.features.map(f => (
          <li key={f.label} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13.5px' }}>
            <span style={{ fontWeight:900, fontSize:'13px', color: f.ok ? '#6ee7b7' : 'rgba(255,255,255,0.18)', flexShrink:0 }}>
              {f.ok ? '✓' : '—'}
            </span>
            <span style={{ color: f.ok ? t : 'rgba(255,255,255,0.25)' }}>{f.label}</span>
          </li>
        ))}
      </ul>

      {plan.ctaHref ? (
        <Link href={plan.ctaHref} style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:'12px', fontWeight:700, fontSize:'14px', textDecoration:'none',
          background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
          border: dark ? '1px solid rgba(255,255,255,0.25)' : `1px solid ${BORDER}`,
          color: t }}>
          {plan.cta}
        </Link>
      ) : (
        <button
          onClick={() => onBuy(plan)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'12px', fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'inherit',
            background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
            border: dark ? '1px solid rgba(255,255,255,0.25)' : `1px solid ${BORDER}`,
            color: t }}>
          {plan.cta}
          <span style={{ fontSize:'10px', background:'rgba(245,158,11,0.2)', color:'#fbbf24', padding:'2px 8px', borderRadius:'999px', fontWeight:800 }}>
            곧 오픈
          </span>
        </button>
      )}
    </>
  );
}
