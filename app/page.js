import Link from 'next/link';

const TEXT   = '#f0f0ff';
const MUTED  = 'rgba(255,255,255,0.50)';
const DIM    = 'rgba(255,255,255,0.25)';
const CARD   = 'rgba(255,255,255,0.035)';
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
          <stop stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── AI 채팅 목업 ── */
function AIChatMockup() {
  const msgs = [
    { role: 'user', text: '다음 주 수요일 오후 2시에 클라이언트 미팅 잡아줘. 높은 우선순위로.' },
    { role: 'ai', text: '6월 11일(수) 오후 2:00 클라이언트 미팅을 높은 우선순위로 추가했습니다. 관련 팀원에게 알림을 보낼까요?', action: '✓ 일정 추가됨 · 6월 11일(수) 14:00' },
    { role: 'user', text: '이번 주 남은 일정 조율해줘. 목요일 오전이 너무 몰려있어.' },
    { role: 'ai', text: '목요일 오전 3개 일정 중 2개를 금요일로 이동하는 것을 제안드립니다. 수락하시겠습니까?', action: '→ 스탠드업 10:00 · 코드 리뷰 11:00 이동 제안' },
  ];
  return (
    <div style={{ background: '#0c0c1b', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 80px rgba(0,0,0,.7), 0 0 60px rgba(99,102,241,.12)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
        <span style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>AI 일정 비서</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6ee7b7', fontWeight: 700 }}>● 온라인</span>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
            <div style={{
              maxWidth: '85%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
              border: m.role === 'user' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
              fontSize: 12, color: TEXT, lineHeight: 1.55,
            }}>{m.text}</div>
            {m.action && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '3px 10px' }}>
                {m.action}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          일정을 자연어로 입력하세요…
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
      </div>
    </div>
  );
}

/* ── 기능 목록 ── */
const FEATURES = [
  { icon: '✦', color: '#818cf8', bg: 'rgba(99,102,241,0.12)', bc: 'rgba(99,102,241,0.3)',  title: 'AI 자연어 일정 추가',   desc: '"다음 주 화요일 오후 3시 팀 미팅, 긴급"처럼 자연어로 말하면 AI가 즉시 일정을 생성합니다.' },
  { icon: '🗓', color: '#6ee7b7', bg: 'rgba(16,185,129,0.10)', bc: 'rgba(16,185,129,0.3)',  title: 'AI 일정 자동 조율',     desc: '일정이 겹치거나 과부하 시 AI가 팀 전체 일정을 분석해 최적 재배치를 제안합니다.' },
  { icon: '👥', color: '#60a5fa', bg: 'rgba(59,130,246,0.10)', bc: 'rgba(59,130,246,0.3)',  title: '팀 캘린더 & 플래너',    desc: '팀원별 일정 공유, 업무 분배, 마감 추적을 하나의 화면에서. 초대 코드로 1분 안에 팀 구성.' },
  { icon: '🔌', color: '#f9a8d4', bg: 'rgba(236,72,153,0.10)', bc: 'rgba(236,72,153,0.3)',  title: 'Slack · Notion 연동',    desc: '기존에 쓰던 Slack으로 알림, Notion DB에서 일정 동기화. 도구를 바꾸지 않아도 됩니다.' },
  { icon: '🔒', color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', bc: 'rgba(245,158,11,0.3)',  title: '기업 보안 (RLS)',        desc: 'Row Level Security로 팀원 데이터 격리. 내 팀 일정은 내 팀만 볼 수 있습니다.' },
  { icon: '📊', color: '#a78bfa', bg: 'rgba(139,92,246,0.10)', bc: 'rgba(139,92,246,0.3)',  title: '팀 생산성 분석',         desc: '완료율, 지연율, 팀원별 업무량을 실시간 대시보드로 확인. 병목을 즉시 파악하세요.' },
];

/* ── 경쟁사 비교 ── */
const COMPARE = [
  { label: 'AI 자연어 일정',    tc: true,  asana: false, notion: false, kakao: false },
  { label: 'AI 자동 조율 제안', tc: true,  asana: false, notion: false, kakao: false },
  { label: '팀 캘린더',         tc: true,  asana: true,  notion: true,  kakao: true  },
  { label: 'Slack · Notion 연동',tc: true, asana: true,  notion: true,  kakao: false },
  { label: '한국 공휴일 자동',   tc: true,  asana: false, notion: false, kakao: true  },
  { label: '간편한 온보딩',      tc: true,  asana: false, notion: false, kakao: true  },
  { label: '합리적 팀 요금제',   tc: true,  asana: false, notion: false, kakao: false },
];

const PLANS_MINI = [
  { name: '무료',     price: 0,      sub: '영구 무료',      feats: ['개인 사용', '할일 50개/월', '기본 캘린더'], featured: false, cta: '무료 시작', href: '/login' },
  { name: 'Business', price: 19900,  sub: '/월 · 팀 전체',  feats: ['팀원 최대 10명', '무제한 일정', 'AI 일정 추가·조율', 'Slack·Notion 연동', '팀 분석 대시보드'], featured: true, badge: '가장 인기', cta: '팀 시작하기', href: null },
  { name: 'Enterprise',price: 49900, sub: '/월 · 팀 전체',  feats: ['팀원 무제한', '전용 온보딩', 'SSO·보안감사', 'SLA 99.9%', '전담 고객 지원'], featured: false, cta: '도입 문의', href: 'mailto:hello@teamcalendar.app' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#070711', color: TEXT, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif", overflowX: 'hidden' }}>

      {/* 배경 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 1000, height: 700, background: 'radial-gradient(ellipse,rgba(99,102,241,0.14) 0%,transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '45%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(ellipse,rgba(139,92,246,0.07) 0%,transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '65%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(ellipse,rgba(6,182,212,0.06) 0%,transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%,black,transparent)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64, display: 'flex', alignItems: 'center', background: 'rgba(7,7,17,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={30} gradId="navLg" />
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.025em', color: TEXT }}>Team<span style={{ color: '#818cf8' }}>Calendar</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href="/pricing" style={{ fontSize: 14, color: MUTED, padding: '7px 12px', borderRadius: 8, textDecoration: 'none' }}>요금제</Link>
            <Link href="/login"   style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)', padding: '7px 12px', borderRadius: 8, textDecoration: 'none' }}>로그인</Link>
            <Link href="/login"   style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '8px 18px', borderRadius: 10, textDecoration: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.45)' }}>
              무료로 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: 148, paddingBottom: 88 }}>
        <div className="landing-section-pad" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="landing-hero-grid">
            <div className="animate-fade-up">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)', borderRadius: 999, padding: '5px 14px', marginBottom: 28, fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em' }}>
                ✦&nbsp; 한국 중소기업 팀을 위한 AI 일정 관리
              </div>
              <h1 style={{ fontSize: 'clamp(2.5rem,5.5vw,3.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 20 }}>
                팀 일정,<br />
                <span className="gradient-text">AI가 자동으로 잡아드립니다</span>
              </h1>
              <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.75, marginBottom: 36 }}>
                Asana처럼 복잡하지 않고, 카카오워크처럼 가볍지 않게.<br />
                자연어로 말하면 AI가 일정을 추가하고 팀 전체를 조율합니다.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 28px rgba(99,102,241,0.45)' }}>
                  팀 무료로 시작하기 →
                </Link>
                <Link href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 15, padding: '13px 24px', borderRadius: 12, textDecoration: 'none' }}>
                  팀 요금제 보기
                </Link>
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {['✦ 도입 즉시 사용', '✦ 신용카드 불필요', '✦ 14일 무료 체험'].map(l => (
                  <span key={l} style={{ fontSize: 13, color: DIM, fontWeight: 600 }}>{l}</span>
                ))}
              </div>
            </div>
            <div className="landing-mockup" style={{ filter: 'drop-shadow(0 40px 60px rgba(99,102,241,0.18))' }}>
              <AIChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 로고 스트립 */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: DIM, fontWeight: 600, letterSpacing: '0.06em' }}>통합 연동</span>
          {[['🔔','Slack'], ['📝','Notion'], ['📅','Google Calendar'], ['🔒','Supabase RLS']].map(([icon, name]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: MUTED, fontWeight: 600 }}>
              <span>{icon}</span>{name}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: 'relative', zIndex: 1, padding: '96px 0' }}>
        <div className="landing-section-pad" style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.04em' }}>
              ✦&nbsp; 핵심 기능
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
              팀이 실제로 필요한 것만
            </h2>
            <p style={{ fontSize: 16, color: MUTED, maxWidth: 480, margin: '0 auto' }}>
              복잡한 기능 없이, 팀 일정 관리에 꼭 필요한 기능을 AI와 함께 제공합니다.
            </p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, border: `1px solid ${f.bc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, color: TEXT }}>{f.title}</div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 경쟁사 비교 */}
      <section style={{ position: 'relative', zIndex: 1, padding: '88px 0', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="landing-section-pad" style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>
              ✦&nbsp; 왜 TeamCalendar인가요?
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem,3vw,2.3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10 }}>
              다른 서비스와 무엇이 다른가요
            </h2>
            <p style={{ fontSize: 15, color: MUTED }}>Asana는 너무 복잡하고, Notion 캘린더는 팀 기능이 부족합니다.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: DIM, fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}></th>
                  {[['TeamCalendar','#818cf8'], ['Asana',MUTED], ['Notion',MUTED], ['카카오워크',MUTED]].map(([name, color]) => (
                    <th key={name} style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 800, fontSize: name === 'TeamCalendar' ? 14 : 13, color, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                      {name === 'TeamCalendar' && <span style={{ marginRight: 5 }}>✦</span>}{name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={row.label} style={{ borderBottom: i < COMPARE.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: MUTED, fontSize: 13.5 }}>{row.label}</td>
                    {[row.tc, row.asana, row.notion, row.kakao].map((v, j) => (
                      <td key={j} style={{ textAlign: 'center', padding: '12px 16px' }}>
                        {v
                          ? <span style={{ color: '#6ee7b7', fontWeight: 900, fontSize: 15 }}>✓</span>
                          : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING 미리보기 */}
      <section style={{ position: 'relative', zIndex: 1, padding: '96px 0' }}>
        <div className="landing-section-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#6ee7b7' }}>
              ✦&nbsp; 요금제
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
              팀 규모에 맞는 요금제
            </h2>
            <p style={{ fontSize: 16, color: MUTED }}>월 단위 구독, 언제든 해지 가능. 연간 결제 시 2개월 무료.</p>
          </div>
          <div className="landing-pricing-grid">
            {PLANS_MINI.map(p => {
              const inner = (
                <>
                  {p.badge && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>{p.badge}</div>}
                  <div style={{ fontSize: 12, fontWeight: 700, color: DIM, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', color: TEXT }}>
                      {p.price === 0 ? '무료' : `₩${p.price.toLocaleString('ko-KR')}`}
                    </span>
                    {p.price > 0 && <span style={{ fontSize: 12, color: MUTED }}>{p.sub}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 24 }}>
                    {p.price === 0 ? '영구 무료' : '연간 결제 시 17% 할인'}
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 24 }}>
                    {p.feats.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: TEXT }}>
                        <span style={{ color: '#6ee7b7', fontWeight: 900, fontSize: 12 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {p.href ? (
                    <Link href={p.href} style={{ display: 'block', textAlign: 'center', padding: 11, borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: p.featured ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', border: p.featured ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${BORDER}`, color: TEXT }}>
                      {p.cta}
                    </Link>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 11, borderRadius: 12, fontWeight: 700, fontSize: 14, background: p.featured ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', border: p.featured ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${BORDER}`, color: TEXT, cursor: 'pointer' }}>
                      {p.cta} <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '2px 7px', borderRadius: 999, marginLeft: 4, fontWeight: 800 }}>준비중</span>
                    </div>
                  )}
                </>
              );
              return p.featured ? (
                <div key={p.name} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.5px', borderRadius: 20, boxShadow: '0 0 48px rgba(99,102,241,0.3)' }}>
                  <div style={{ background: '#0f0f20', borderRadius: 19, padding: 28, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>{inner}</div>
                </div>
              ) : (
                <div key={p.name} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', position: 'relative' }}>{inner}</div>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: DIM }}>
            연간 결제 시 2개월 무료 · 언제든 해지 가능 ·{' '}
            <Link href="/pricing" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>전체 요금제 비교 →</Link>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '88px 0', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="landing-section-pad" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 28, padding: '60px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(99,102,241,0.1),transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 999, padding: '4px 12px', marginBottom: 20, fontSize: 12, fontWeight: 700, color: '#a5b4fc', position: 'relative' }}>
              ✦ 지금 팀 무료 체험
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14, position: 'relative' }}>
              우리 팀에도 AI 비서가 생겼습니다
            </h2>
            <p style={{ fontSize: 16, color: MUTED, marginBottom: 32, position: 'relative' }}>
              도입 5분, 효과는 바로. 신용카드 없이 팀 전체가 무료로 시작하세요.
            </p>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 800, fontSize: 16, padding: '15px 32px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(99,102,241,0.5)', position: 'relative' }}>
              팀 무료로 시작하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 0', position: 'relative', zIndex: 1 }}>
        <div className="landing-section-pad" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={22} gradId="footLg" />
            <span style={{ fontWeight: 800, fontSize: 15, color: TEXT }}>Team<span style={{ color: '#818cf8' }}>Calendar</span></span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['요금제','/pricing'],['로그인','/login'],['이용약관','/terms'],['개인정보처리방침','/privacy']].map(([l,h]) => (
              <Link key={l} href={h} style={{ fontSize: 13, color: DIM, textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 TeamCalendar</p>
        </div>
      </footer>
    </div>
  );
}
