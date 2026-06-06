'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TEXT   = '#f0f0ff';
const MUTED  = 'rgba(255,255,255,0.48)';
const DIM    = 'rgba(255,255,255,0.22)';
const CARD   = 'rgba(255,255,255,0.035)';
const BORDER = 'rgba(255,255,255,0.08)';

function Logo({ size = 32, gradId = 'lg0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <rect x="8" y="14" width="24" height="1.5" rx=".75" fill="rgba(255,255,255,0.28)" />
      <rect x="12.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="24.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="8" y="19.5" width="13" height="3" rx="1.5" fill="rgba(255,255,255,0.88)" />
      <rect x="23.5" y="19.5" width="8.5" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="8" y="25.5" width="8" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="18.5" y="25.5" width="13.5" height="3" rx="1.5" fill="rgba(255,255,255,0.65)" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const PLANS = [
  {
    id: 'free',
    name: '무료',
    tagline: '개인 사용 · 팀 체험',
    monthly: 0,
    yearly: 0,
    badge: null,
    featured: false,
    cta: '무료로 시작',
    ctaHref: '/login',
    members: '1명',
    features: [
      { label: '개인 캘린더 (월·주·일 뷰)',  ok: true },
      { label: '할일 50개/월',                ok: true },
      { label: '기본 알림',                   ok: true },
      { label: '한국 공휴일 자동 표시',       ok: true },
      { label: 'AI 자연어 일정 추가',         ok: false },
      { label: 'AI 일정 자동 조율',           ok: false },
      { label: '팀 캘린더·플래너',            ok: false },
      { label: 'Slack·Notion 연동',           ok: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: '중소기업 · 스타트업 팀',
    monthly: 19900,
    yearly: 16600,
    badge: '가장 인기',
    featured: true,
    cta: '팀 시작하기',
    ctaHref: null,
    members: '최대 10명',
    features: [
      { label: '무제한 할일 · 일정',          ok: true },
      { label: '팀원 최대 10명',              ok: true },
      { label: 'AI 자연어 일정 추가',         ok: true, highlight: true },
      { label: 'AI 일정 자동 조율 제안',      ok: true, highlight: true },
      { label: '팀 캘린더 · 플래너',          ok: true },
      { label: 'Slack · Notion 연동',         ok: true },
      { label: '팀 생산성 분석 대시보드',     ok: true },
      { label: '마감 전 알림 + 반복 일정',    ok: true },
      { label: 'Google Calendar 동기화',      ok: true },
      { label: '이메일 지원',                 ok: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: '대기업 · 보안 필요 조직',
    monthly: 49900,
    yearly: 41600,
    badge: null,
    featured: false,
    cta: '도입 문의하기',
    ctaHref: 'mailto:hello@teamcalendar.app',
    members: '팀원 무제한',
    features: [
      { label: 'Business 모든 기능',          ok: true },
      { label: '팀원 무제한',                 ok: true },
      { label: 'SSO (Single Sign-On)',        ok: true },
      { label: '보안 감사 로그',              ok: true },
      { label: '전용 온보딩 & 교육',         ok: true },
      { label: 'SLA 99.9% 보장',             ok: true },
      { label: '전담 고객 성공 매니저',       ok: true },
      { label: '커스텀 도메인·브랜딩',        ok: true },
      { label: '계약서 · 세금계산서 발행',    ok: true },
      { label: '전화 지원',                   ok: true },
    ],
  },
];

const FAQ = [
  { q: '팀 전체 요금인가요, 인당 요금인가요?', a: 'Business·Enterprise 모두 팀 전체 고정 요금입니다. 팀원이 늘어도 추가 비용이 없습니다.' },
  { q: '언제든 해지할 수 있나요?', a: '네, 별도 위약금 없이 언제든 해지 가능합니다. 결제 기간 중 해지 시 남은 기간까지 서비스가 유지됩니다.' },
  { q: '연간 결제 혜택은 무엇인가요?', a: '연간 결제 시 2개월치 금액을 절약할 수 있습니다. Business 기준 월 16,600원으로 이용 가능합니다.' },
  { q: 'AI 일정 추가·조율은 어떻게 작동하나요?', a: '"다음 주 수요일 오후 2시 클라이언트 미팅, 높은 우선순위"처럼 자연어로 입력하면 AI가 날짜·시간·우선순위를 파악해 즉시 일정을 생성합니다. 일정 조율은 겹치는 일정을 분석해 최적 시간을 제안합니다.' },
  { q: '기존 팀 도구(Slack, Notion)와 연동되나요?', a: '네. Slack으로 마감 알림을 받고, Notion DB와 양방향 동기화가 가능합니다. Google Calendar 가져오기/내보내기도 지원합니다.' },
  { q: 'Enterprise 도입 문의는 어떻게 하나요?', a: 'hello@teamcalendar.app으로 연락 주시면 영업일 기준 1일 이내 회신 드립니다. 데모 세션도 제공합니다.' },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const router = useRouter();

  async function handleUpgrade(planId) {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:hello@teamcalendar.app?subject=Enterprise 도입 문의';
      return;
    }
    try {
      const res  = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planId }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      if (data.error === '인증 필요') { router.push('/login?next=/pricing'); return; }
      alert(data.error || '결제 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    } catch {
      alert('결제 서버에 연결할 수 없습니다.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070711', color: TEXT, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', background: 'rgba(7,7,17,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <Logo size={26} gradId="pricingNav" />
            <span style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>Team<span style={{ color: '#818cf8' }}>Calendar</span></span>
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login" style={{ fontSize: 13, color: MUTED, padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>로그인</Link>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '7px 16px', borderRadius: 9, textDecoration: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>무료 시작</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 96px' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 20, fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>
            ✦ 팀 단위 요금제
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-0.035em', marginBottom: 14 }}>
            팀 전체 고정 요금제
          </h1>
          <p style={{ fontSize: 16, color: MUTED, marginBottom: 32 }}>
            인당 과금 없이 팀 전체가 하나의 요금으로. 멤버가 늘어도 추가 비용 없습니다.
          </p>

          {/* 월간/연간 토글 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '5px 6px' }}>
            <button
              onClick={() => setYearly(false)}
              style={{ padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: !yearly ? 'rgba(99,102,241,0.25)' : 'transparent', color: !yearly ? '#a5b4fc' : MUTED, transition: 'all .15s' }}
            >월간</button>
            <button
              onClick={() => setYearly(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: yearly ? 'rgba(99,102,241,0.25)' : 'transparent', color: yearly ? '#a5b4fc' : MUTED, transition: 'all .15s' }}
            >
              연간
              <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '1px 7px', borderRadius: 999 }}>2개월 무료</span>
            </button>
          </div>
        </div>

        {/* 요금제 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 56 }}>
          {PLANS.map(plan => {
            const price = yearly ? plan.yearly : plan.monthly;
            const cardContent = (
              <>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DIM, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{plan.name}</span>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{plan.tagline}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '12px 0 4px' }}>
                  <span style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.04em', color: TEXT }}>
                    {price === 0 ? '무료' : `₩${price.toLocaleString('ko-KR')}`}
                  </span>
                  {price > 0 && <span style={{ fontSize: 13, color: MUTED }}>/월 · 팀 전체</span>}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
                  {price === 0 ? '영구 무료' : yearly ? `연간 ₩${(price * 12).toLocaleString('ko-KR')} (2개월 무료)` : '연간 결제 시 17% 할인'}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: MUTED, marginBottom: 20 }}>
                  👥 {plan.members}
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <li key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: f.ok ? (f.highlight ? '#a5b4fc' : TEXT) : 'rgba(255,255,255,0.2)', fontWeight: f.highlight ? 700 : 400 }}>
                      <span style={{ color: f.ok ? '#6ee7b7' : 'rgba(255,255,255,0.15)', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                        {f.ok ? '✓' : '—'}
                      </span>
                      {f.label}
                      {f.highlight && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: 999, fontWeight: 800, marginLeft: 2 }}>AI</span>}
                    </li>
                  ))}
                </ul>
                {plan.ctaHref ? (
                  <Link href={plan.ctaHref} style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', background: plan.featured ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', border: plan.featured ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${BORDER}`, color: TEXT }}>
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: plan.featured ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', border: plan.featured ? '1px solid rgba(255,255,255,0.22)' : `1px solid ${BORDER}`, color: TEXT, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {plan.cta}
                  </button>
                )}
              </>
            );

            return plan.featured ? (
              <div key={plan.id} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '1.5px', borderRadius: 20, boxShadow: '0 0 48px rgba(99,102,241,0.28)' }}>
                <div style={{ background: '#0f0f20', borderRadius: 19, padding: '28px 24px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {cardContent}
                </div>
              </div>
            ) : (
              <div key={plan.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {cardContent}
              </div>
            );
          })}
        </div>

        {/* 기능 전체 비교표 */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, textAlign: 'center', marginBottom: 32 }}>전체 기능 비교</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: DIM, fontWeight: 600, letterSpacing: '0.05em' }}>기능</th>
                  {PLANS.map(p => (
                    <th key={p.id} style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 800, color: p.featured ? '#818cf8' : MUTED, whiteSpace: 'nowrap' }}>
                      {p.featured && '✦ '}{p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI 자연어 일정 추가', false, true, true],
                  ['AI 일정 자동 조율', false, true, true],
                  ['팀 캘린더·플래너', false, true, true],
                  ['Slack·Notion 연동', false, true, true],
                  ['Google Calendar 동기화', false, true, true],
                  ['팀원 수', '1명', '최대 10명', '무제한'],
                  ['월 할일 한도', '50개', '무제한', '무제한'],
                  ['반복 일정', false, true, true],
                  ['팀 생산성 분석', false, true, true],
                  ['SSO 로그인', false, false, true],
                  ['보안 감사 로그', false, false, true],
                  ['전담 고객 지원', false, false, true],
                  ['SLA 보장', false, false, true],
                ].map(([label, ...vals]) => (
                  <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '11px 16px', fontSize: 13.5, color: MUTED }}>{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '11px 16px', fontSize: 13 }}>
                        {v === true  && <span style={{ color: '#6ee7b7', fontWeight: 900, fontSize: 15 }}>✓</span>}
                        {v === false && <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                        {typeof v === 'string' && <span style={{ color: TEXT, fontWeight: 600 }}>{v}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, textAlign: 'center', marginBottom: 32 }}>자주 묻는 질문</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 22px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEXT, marginBottom: 8 }}>{q}</div>
                <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.65 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 CTA */}
        <div style={{ textAlign: 'center', marginTop: 72 }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24, padding: '48px 32px' }}>
            <h3 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
              우리 팀에 딱 맞는 플랜을 찾으셨나요?
            </h3>
            <p style={{ fontSize: 15, color: MUTED, marginBottom: 28 }}>
              도입 5분, 신용카드 불필요. 팀 전체가 지금 바로 무료로 시작하세요.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 6px 24px rgba(99,102,241,0.4)' }}>
                무료로 시작하기 →
              </Link>
              <a href="mailto:hello@teamcalendar.app" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 15, padding: '13px 24px', borderRadius: 12, textDecoration: 'none' }}>
                Enterprise 문의
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
