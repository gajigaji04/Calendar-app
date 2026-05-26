import Link from 'next/link';

/* ─────────────────────────────────
   Design constants
───────────────────────────────── */
const CARD   = 'rgba(255,255,255,0.035)';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT   = '#f0f0ff';
const MUTED  = 'rgba(255,255,255,0.45)';
const DIM    = 'rgba(255,255,255,0.22)';

/* ─────────────────────────────────
   Logo SVG
───────────────────────────────── */
function Logo({ size = 36, gradId = 'lg0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      {/* calendar header line */}
      <rect x="8" y="14" width="24" height="1.5" rx=".75" fill="rgba(255,255,255,0.28)" />
      {/* binding pegs */}
      <rect x="12.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="24.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      {/* event rows */}
      <rect x="8"    y="19.5" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.88)" />
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

/* ─────────────────────────────────
   Mini calendar mockup
───────────────────────────────── */
const DAYS = ['일','월','화','수','목','금','토'];
const EVENTS = {
  12: { t:'팀 회의',    c:'#818cf8' },
  19: { t:'보고서 마감', c:'#fbbf24' },
  26: { t:'발표',       c:'#34d399' },
  29: { t:'워크숍',     c:'#a78bfa' },
};

function CalendarMockup() {
  const baseCell = {
    minHeight: '52px', padding: '5px',
    borderRight: '1px solid rgba(255,255,255,0.045)',
    borderBottom: '1px solid rgba(255,255,255,0.045)',
  };
  return (
    <div style={{
      background:'#0c0c1b', borderRadius:'18px', overflow:'hidden',
      border:'1px solid rgba(255,255,255,0.1)',
      boxShadow:'0 48px 96px rgba(0,0,0,.75), 0 0 80px rgba(99,102,241,.1), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      {/* toolbar */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(255,255,255,0.02)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <Logo size={20} gradId="calLg" />
          <span style={{ color:'#f0f0ff', fontWeight:700, fontSize:'13px' }}>2026년 5월</span>
        </div>
        <div style={{ display:'flex', gap:'3px' }}>
          {['월','주','일'].map((t,i)=>(
            <span key={t} style={{
              padding:'3px 9px', borderRadius:'6px', fontSize:'11px', fontWeight:600, cursor:'pointer',
              background: i===0 ? 'rgba(99,102,241,0.25)':'transparent',
              color: i===0 ? '#818cf8':'rgba(255,255,255,0.3)',
              border: i===0 ? '1px solid rgba(99,102,241,0.35)':'1px solid transparent',
            }}>{t}</span>
          ))}
        </div>
      </div>
      {/* day labels */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.015)' }}>
        {DAYS.map(d=>(
          <div key={d} style={{ textAlign:'center', padding:'7px 0', fontSize:'10.5px', fontWeight:700, color:'rgba(255,255,255,0.28)', letterSpacing:'0.04em' }}>{d}</div>
        ))}
      </div>
      {/* grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {Array.from({length:5}).map((_,i)=>(
          <div key={`e${i}`} style={baseCell} />
        ))}
        {Array.from({length:31}).map((_,i)=>{
          const d=i+1, today=d===26, ev=EVENTS[d], col=(i+5)%7;
          return (
            <div key={d} style={{ ...baseCell, borderRight: col===6?'none':baseCell.borderRight, background: today?'rgba(99,102,241,0.08)':'transparent' }}>
              <span style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                width:'20px', height:'20px', borderRadius:'50%', fontSize:'11px', fontWeight:700,
                background: today?'#6366f1':'transparent',
                color: today?'#fff': col===0?'rgba(255,120,120,0.8)':'rgba(255,255,255,0.6)',
              }}>{d}</span>
              {ev && (
                <div style={{
                  marginTop:'2px', padding:'1.5px 4px', borderRadius:'4px',
                  fontSize:'9px', fontWeight:700, lineHeight:'14px',
                  background:`${ev.c}18`, color:ev.c,
                  border:`1px solid ${ev.c}30`,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>{ev.t}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   Feature card data
───────────────────────────────── */
const FEATURES = [
  { icon:'📅', title:'스마트 캘린더',    desc:'월·주·일 뷰 자유 전환. 한국 공휴일 자동 표시 및 직관적인 이벤트 관리.',  c:'rgba(99,102,241,0.15)',  bc:'rgba(99,102,241,0.35)' },
  { icon:'✅', title:'할일 & 마감 알림', desc:'마감 시간 설정 후 1시간·30분 전 자동 브라우저 알림. 절대 놓치지 마세요.', c:'rgba(16,185,129,0.15)', bc:'rgba(16,185,129,0.35)' },
  { icon:'👥', title:'팀 일정 공유',     desc:'팀 생성 & 초대. 그룹 이벤트 RSVP와 팀 일정을 한 화면에서 관리.',       c:'rgba(59,130,246,0.15)',  bc:'rgba(59,130,246,0.35)' },
  { icon:'🔔', title:'실시간 알림',      desc:'브라우저 푸시 알림으로 중요 일정 자동 리마인드. 커스텀 알림 시간 설정.',  c:'rgba(245,158,11,0.15)',  bc:'rgba(245,158,11,0.35)' },
  { icon:'📱', title:'모바일 최적화',    desc:'어느 기기에서도 완벽한 경험. 스마트폰에서 전체 기능을 바로 사용.',       c:'rgba(139,92,246,0.15)', bc:'rgba(139,92,246,0.35)' },
  { icon:'🔒', title:'안전한 데이터',    desc:'Row Level Security로 내 데이터는 나만 봅니다. 엔드투엔드 암호화.',      c:'rgba(239,68,68,0.15)',   bc:'rgba(239,68,68,0.35)'  },
];

/* ─────────────────────────────────
   Pricing data
───────────────────────────────── */
const PLANS = [
  {
    name:'무료', price:0, sub:'영구 무료', featured:false,
    feats:['개인 캘린더','할일 50개/월','월간 뷰','기본 알림'],
    off:['주간·일간 뷰','팀 기능','마감 알림'],
    cta:'무료로 시작', href:'/login',
  },
  {
    name:'프로', price:6900, sub:'/월', featured:true, badge:'가장 인기',
    feats:['무제한 할일','월·주·일 뷰','1h·30m 전 알림','반복 일정','ICS 내보내기'],
    off:['팀 기능'],
    cta:'프로 시작하기', href:null,
  },
  {
    name:'팀', price:12900, sub:'/인/월', featured:false,
    feats:['프로 기능 전체','팀 캘린더 공유','팀원 최대 20명','RSVP 관리','우선 지원'],
    off:[],
    cta:'팀 플랜 시작', href:null,
  },
];

/* ─────────────────────────────────
   Page
───────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ minHeight:'100vh', background:'#070711', color:TEXT, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif", overflowX:'hidden' }}>

      {/* ── 배경 글로우 ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div className="animate-glow" style={{ position:'absolute', top:'-15%', left:'50%', transform:'translateX(-50%)', width:'900px', height:'700px', background:'radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', top:'55%', left:'-8%', width:'500px', height:'500px', background:'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', top:'70%', right:'-5%', width:'400px', height:'400px', background:'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 65%)' }} />
        {/* grid overlay */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize:'72px 72px', maskImage:'radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent)' }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:'64px', display:'flex', alignItems:'center', background:'rgba(7,7,17,0.8)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 24px', width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Logo size={32} gradId="navLg" />
            <span style={{ fontWeight:800, fontSize:'17px', letterSpacing:'-0.025em', color:TEXT }}>
              Team<span style={{ color:'#818cf8' }}>Calendar</span>
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <Link href="/pricing" className="hidden sm:block" style={{ fontSize:'14px', color:MUTED, padding:'7px 12px', borderRadius:'8px', textDecoration:'none', transition:'color .2s' }}>
              요금제
            </Link>
            <Link href="/login" style={{ fontSize:'14px', fontWeight:600, color:'rgba(255,255,255,0.75)', padding:'7px 12px', borderRadius:'8px', textDecoration:'none' }}>
              로그인
            </Link>
            <Link href="/login" style={{ fontSize:'13px', fontWeight:700, color:'#fff', padding:'8px 18px', borderRadius:'10px', textDecoration:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 4px 20px rgba(99,102,241,0.45)', letterSpacing:'0.01em' }}>
              무료로 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:'relative', zIndex:1, paddingTop:'148px', paddingBottom:'88px' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'56px', alignItems:'center' }}>

            {/* copy */}
            <div className="animate-fade-up">
              <div style={{ display:'inline-flex', alignItems:'center', gap:'7px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.28)', borderRadius:'999px', padding:'5px 14px', marginBottom:'28px', fontSize:'12px', fontWeight:700, color:'#a5b4fc', letterSpacing:'0.04em' }}>
                ✦&nbsp; 학생 · 직장인 · 팀 모두를 위한
              </div>

              <h1 style={{ fontSize:'clamp(2.6rem,5.5vw,4rem)', fontWeight:900, letterSpacing:'-0.035em', lineHeight:1.08, marginBottom:'20px' }}>
                개인부터 팀까지<br />
                <span className="gradient-text">일정을 한 곳에서</span>
              </h1>

              <p style={{ fontSize:'17px', color:MUTED, lineHeight:1.75, marginBottom:'36px' }}>
                할일 관리, 마감 알림, 팀 일정 공유까지.<br />
                복잡한 하루를 단순하게 만들어 드립니다.
              </p>

              <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', marginBottom:'28px' }}>
                <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:'15px', padding:'13px 26px', borderRadius:'12px', textDecoration:'none', boxShadow:'0 8px 28px rgba(99,102,241,0.45)' }}>
                  무료로 시작하기 →
                </Link>
                <Link href="/pricing" style={{ display:'inline-flex', alignItems:'center', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:'15px', padding:'13px 24px', borderRadius:'12px', textDecoration:'none' }}>
                  요금제 보기
                </Link>
              </div>

              <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
                {['🎓 학생','💼 직장인','🚀 취준생','👥 팀'].map(l=>(
                  <span key={l} style={{ fontSize:'13px', color:DIM, fontWeight:600 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* mockup */}
            <div style={{ filter:'drop-shadow(0 40px 60px rgba(99,102,241,0.15))' }}>
              <CalendarMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ position:'relative', zIndex:1, paddingTop:'88px', paddingBottom:'88px' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:'999px', padding:'5px 14px', marginBottom:'16px', fontSize:'12px', fontWeight:700, color:'#c4b5fd', letterSpacing:'0.04em' }}>
              ✦&nbsp; 핵심 기능
            </div>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'12px' }}>
              하나의 앱으로 충분해요
            </h2>
            <p style={{ fontSize:'16px', color:MUTED, maxWidth:'480px', margin:'0 auto' }}>
              여기저기 흩어진 메모·캘린더·알림을 TeamCalendar 하나로 통합하세요.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'20px' }}>
            {FEATURES.map(f=>(
              <div key={f.title} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:'16px', padding:'24px', transition:'border-color .2s, transform .2s', cursor:'default' }}
                onMouseEnter={undefined}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:f.c, border:`1px solid ${f.bc}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'16px' }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight:800, fontSize:'15px', marginBottom:'8px', color:TEXT }}>{f.title}</div>
                <p style={{ fontSize:'13.5px', color:MUTED, lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ position:'relative', zIndex:1, paddingTop:'88px', paddingBottom:'88px', background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'0 48px' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'999px', padding:'5px 14px', marginBottom:'16px', fontSize:'12px', fontWeight:700, color:'#6ee7b7', letterSpacing:'0.04em' }}>
              ✦&nbsp; 요금제
            </div>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'12px' }}>
              합리적인 가격
            </h2>
            <p style={{ fontSize:'16px', color:MUTED }}>무료로 시작하고, 필요할 때 업그레이드하세요.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'24px' }}>
            {PLANS.map(p=>{
              if (p.featured) return (
                <div key={p.name} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', padding:'1.5px', borderRadius:'20px', boxShadow:'0 0 48px rgba(99,102,241,0.3)' }}>
                  <div style={{ background:'#0f0f20', borderRadius:'19px', padding:'28px', height:'100%', display:'flex', flexDirection:'column', position:'relative' }}>
                    {p.badge && <div style={{ position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#f59e0b,#f97316)', color:'#fff', fontSize:'11px', fontWeight:800, padding:'4px 14px', borderRadius:'999px', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{p.badge}</div>}
                    <PlanContent plan={p} dark />
                  </div>
                </div>
              );
              return (
                <div key={p.name} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:'20px', padding:'28px', display:'flex', flexDirection:'column' }}>
                  <PlanContent plan={p} />
                </div>
              );
            })}
          </div>

          <p style={{ textAlign:'center', marginTop:'24px', fontSize:'13px', color:DIM }}>
            연간 결제 시 2개월 무료 · 언제든 해지 가능
            {' '}·{' '}
            <Link href="/pricing" style={{ color:'#818cf8', textDecoration:'none', fontWeight:600 }}>전체 비교 →</Link>
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position:'relative', zIndex:1, paddingTop:'88px', paddingBottom:'88px' }}>
        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'0 48px', textAlign:'center' }}>
          <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))', border:'1px solid rgba(99,102,241,0.22)', borderRadius:'28px', padding:'60px 32px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.1), transparent 60%)', pointerEvents:'none' }} />
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'14px', position:'relative' }}>
              지금 바로 시작하세요
            </h2>
            <p style={{ fontSize:'16px', color:MUTED, marginBottom:'32px', position:'relative' }}>
              이메일 하나로 가입 완료. 신용카드 불필요. 영구 무료 플랜 제공.
            </p>
            <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:800, fontSize:'16px', padding:'15px 32px', borderRadius:'14px', textDecoration:'none', boxShadow:'0 8px 28px rgba(99,102,241,0.5)', position:'relative' }}>
              무료로 시작하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'32px', paddingBottom:'32px', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 48px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <Logo size={24} gradId="footLg" />
            <span style={{ fontWeight:800, fontSize:'15px', color:TEXT }}>
              Team<span style={{ color:'#818cf8' }}>Calendar</span>
            </span>
          </div>
          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', justifyContent:'center' }}>
            {[['요금제','/pricing'],['로그인','/login'],['이용약관','/terms'],['개인정보처리방침','/privacy']].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:'13px', color:DIM, textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
          <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.2)' }}>© 2026 TeamCalendar</p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────
   Pricing plan content
───────────────────────────────── */
function PlanContent({ plan, dark=false }) {
  const t = dark ? '#f0f0ff' : TEXT;
  const m = dark ? 'rgba(255,255,255,0.55)' : MUTED;
  return (
    <>
      <div style={{ fontSize:'13px', fontWeight:700, color: dark?'rgba(255,255,255,0.45)':DIM, marginBottom:'4px', letterSpacing:'0.05em', textTransform:'uppercase' }}>{plan.name}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'4px' }}>
        <span style={{ fontSize:'36px', fontWeight:900, letterSpacing:'-0.04em', color:t }}>
          {plan.price===0 ? '무료' : `₩${plan.price.toLocaleString('ko-KR')}`}
        </span>
        {plan.price>0 && <span style={{ fontSize:'13px', color:m }}>{plan.sub}</span>}
      </div>
      <div style={{ fontSize:'12px', color:m, marginBottom:'24px' }}>{plan.price===0 ? '영구 무료' : '연간 결제 시 17% 할인'}</div>

      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', flex:1, marginBottom:'24px' }}>
        {plan.feats.map(f=>(
          <li key={f} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13.5px', color:t }}>
            <span style={{ color:'#6ee7b7', fontWeight:900, fontSize:'13px' }}>✓</span>{f}
          </li>
        ))}
        {plan.off.map(f=>(
          <li key={f} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'rgba(255,255,255,0.2)' }}>
            <span style={{ fontWeight:700, fontSize:'12px' }}>—</span>{f}
          </li>
        ))}
      </ul>

      {plan.href ? (
        <Link href={plan.href} style={{ display:'block', textAlign:'center', padding:'11px', borderRadius:'12px', fontWeight:700, fontSize:'14px', textDecoration:'none', background: dark?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.06)', border: dark?'1px solid rgba(255,255,255,0.2)':'1px solid rgba(255,255,255,0.1)', color:t }}>
          {plan.cta}
        </Link>
      ) : (
        <div style={{ display:'block', textAlign:'center', padding:'11px', borderRadius:'12px', fontWeight:700, fontSize:'14px', background: dark?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.06)', border: dark?'1px solid rgba(255,255,255,0.2)':'1px solid rgba(255,255,255,0.1)', color:t, cursor:'pointer' }}>
          {plan.cta} <span style={{ fontSize:'10px', background:'rgba(245,158,11,0.2)', color:'#fbbf24', padding:'2px 7px', borderRadius:'999px', marginLeft:'4px', fontWeight:800 }}>준비중</span>
        </div>
      )}
    </>
  );
}
