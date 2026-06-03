import Link from 'next/link';

const TEXT  = '#f0f0ff';
const MUTED = 'rgba(255,255,255,0.5)';
const DIM   = 'rgba(255,255,255,0.28)';

const SECTIONS = [
  {
    title: '제1조 (수집하는 개인정보 항목)',
    body: `TeamCalendar(이하 "서비스")는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.\n\n[필수 항목]\n- 이메일 주소\n- 비밀번호 (단방향 암호화 저장)\n- 이름 또는 닉네임\n\n[소셜 로그인 시 자동 수집]\n- Google, GitHub, Kakao 계정으로부터 이메일, 이름, 프로필 이미지\n\n[결제 시 수집]\n- 결제 수단 정보는 Stripe Inc.가 직접 수집·처리합니다.\n- 서비스는 결제 내역(금액, 결제일, 상품명)만 보관하며 카드번호 등 원본 결제 정보는 저장하지 않습니다.\n\n[서비스 이용 중 자동 생성]\n- 일정·할일 데이터 (제목, 날짜, 마감일, 우선순위, 카테고리 등)\n- 접속 IP, 접속 일시, 서비스 이용 기록\n\n[기기 내 저장 — 서버 미전송]\n- 브라우저 알림 설정 등 UI 환경설정은 이용자 기기의 localStorage에만 저장되며 외부로 전송되지 않습니다.`,
  },
  {
    title: '제2조 (개인정보의 처리 목적)',
    body: `수집한 개인정보는 다음의 목적으로만 이용됩니다.\n① 회원 식별 및 로그인 처리\n② 서비스 제공 및 운영 (캘린더·할일·마감 알림·팀 협업·AI 기능)\n③ 결제 처리 및 구독 관리\n④ 외부 서비스 연동 (Google Calendar, Notion, Slack)\n⑤ 이메일 인증 코드 발송\n⑥ 고객 문의 및 불만 처리\n⑦ 서비스 개선을 위한 통계 분석\n⑧ 법령에 따른 의무 이행`,
  },
  {
    title: '제3조 (개인정보의 보유 및 이용 기간)',
    body: `개인정보는 서비스 이용 계약 유지 기간 동안 보유하며, 회원 탈퇴 시 지체 없이 파기합니다.\n단, 관련 법령에 따라 아래 기간 동안 보관합니다.\n\n- 계약·청약철회·대금결제 기록: 5년 (전자상거래 등에서의 소비자 보호에 관한 법률)\n- 소비자 불만·분쟁처리 기록: 3년 (전자상거래 등에서의 소비자 보호에 관한 법률)\n- 접속 로그 기록: 3개월 (통신비밀보호법)`,
  },
  {
    title: '제4조 (개인정보의 파기)',
    body: `서비스는 보유 기간이 경과하거나 처리 목적이 달성된 경우 해당 개인정보를 파기합니다.\n\n[파기 절차]\n이용자가 입력한 정보는 목적 달성 후 별도 DB에 옮겨 관계 법령에 따라 일정 기간 보관 후 파기됩니다.\n\n[파기 방법]\n- 전자적 파일: 복구 불가능한 방법으로 영구 삭제\n- 종이 서류: 분쇄 또는 소각`,
  },
  {
    title: '제5조 (개인정보의 제3자 제공)',
    body: `서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.\n다만 아래의 경우는 예외입니다.\n\n[결제 처리 목적 제공]\n- 제공받는 자: Stripe Inc.\n- 제공 항목: 이메일, 결제 금액, 구독 플랜\n- 이용 목적: 결제 처리 및 구독 관리\n- 보유 기간: Stripe 개인정보처리방침에 따름\n\n① 이용자가 사전에 동의한 경우\n② 법령의 규정에 따라 수사·감독 기관의 요청이 있는 경우`,
  },
  {
    title: '제6조 (개인정보 처리의 위탁)',
    body: `서비스는 원활한 운영을 위해 아래 업체에 개인정보 처리를 위탁하고 있습니다.\n\n수탁업체 | 위탁 업무\n- Supabase Inc. | 데이터베이스 저장, 회원 인증 처리\n- Vercel Inc.   | 서비스 호스팅 및 배포\n- Stripe Inc.   | 결제 처리 및 구독 관리\n\n위탁 계약 시 개인정보 보호 관련 법규의 준수, 개인정보 제3자 제공 금지, 사고 발생 시 책임 부담 등을 규정하며, 이를 준수하고 있습니다.`,
  },
  {
    title: '제7조 (정보주체의 권리·의무)',
    body: `이용자(정보주체)는 언제든지 다음의 권리를 행사할 수 있습니다.\n① 개인정보 열람 요청 (개인정보보호법 제35조)\n② 개인정보 정정·삭제 요청 (제36조)\n③ 개인정보 처리 정지 요청 (제37조)\n④ 개인정보 처리에 대한 동의 철회 (제38조)\n⑤ 회원 탈퇴 — 서비스 내 [설정] 페이지에서 직접 처리 가능\n\n권리 행사는 아래 개인정보 보호 책임자에게 서면, 전화, 이메일로 요청하실 수 있으며, 접수 후 10일 이내 조치합니다.\n\n이용자는 개인정보보호법 등 관계 법령을 준수하여야 하며, 타인의 개인정보를 침해해서는 안 됩니다.`,
  },
  {
    title: '제8조 (개인정보의 안전성 확보 조치)',
    body: `서비스는 개인정보보호법 제29조에 따라 아래와 같은 안전성 확보 조치를 취하고 있습니다.\n\n① 비밀번호 단방향 암호화 저장 (bcrypt)\n② Row Level Security (RLS) 적용 — 본인 데이터만 조회·수정 가능\n③ HTTPS 전 구간 암호화 통신\n④ Supabase JWT 인증 토큰 기반 세션 관리\n⑤ API Rate Limiting — IP당 분당 10회 호출 제한으로 무단 접근 방지\n⑥ 결제 정보는 PCI DSS 인증 업체(Stripe)를 통해서만 처리`,
  },
  {
    title: '제9조 (쿠키 등 자동 수집 장치)',
    body: `서비스는 세션 유지 및 인증을 위해 브라우저 쿠키 및 localStorage를 사용합니다.\n\n[사용 목적]\n- 로그인 세션 유지 (Supabase 인증 토큰)\n- 알림 설정 등 UI 환경설정 저장\n\n[거부 방법]\n이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다.\n단, 쿠키 거부 시 로그인이 유지되지 않을 수 있습니다.`,
  },
  {
    title: '제10조 (개인정보 처리방침 변경)',
    body: `본 방침은 법령 개정 또는 서비스 변경에 따라 수정될 수 있습니다.\n변경 시 시행 7일 전부터 서비스 공지사항 또는 이메일을 통해 사전 고지합니다.\n중요한 변경(이용 목적, 제3자 제공 등)의 경우 30일 전 고지합니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#070711',
      color: TEXT,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'20px 0', background:'rgba(7,7,17,0.9)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:'768px', margin:'0 auto', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:'8px', textDecoration:'none' }}>
            <span style={{ fontSize:'20px' }}>📅</span>
            <span style={{ fontWeight:800, fontSize:'15px', color:TEXT }}>Team<span style={{ color:'#818cf8' }}>Calendar</span></span>
          </Link>
          <Link href="/login" style={{ fontSize:'13px', color:'#818cf8', fontWeight:600, textDecoration:'none' }}>
            ← 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth:'768px', margin:'0 auto', padding:'60px 32px 96px' }}>
        <div style={{ marginBottom:'48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:'999px', padding:'4px 12px', marginBottom:'16px', fontSize:'11px', fontWeight:700, color:'#6ee7b7', letterSpacing:'0.05em' }}>
            법적 고지
          </div>
          <h1 style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'12px' }}>
            개인정보처리방침
          </h1>
          <p style={{ fontSize:'13.5px', color:DIM }}>
            시행일: 2026년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2026년 6월 3일
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'40px' }}>
          {SECTIONS.map((sec, i) => (
            <div key={i}>
              <h2 style={{ fontSize:'15px', fontWeight:800, color:TEXT, marginBottom:'12px', letterSpacing:'-0.01em' }}>
                {sec.title}
              </h2>
              <p style={{ fontSize:'14px', color:MUTED, lineHeight:1.85, whiteSpace:'pre-line' }}>
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'56px', padding:'20px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px' }}>
          <p style={{ fontSize:'13.5px', fontWeight:700, color:TEXT, marginBottom:'10px' }}>개인정보 보호 책임자</p>
          <p style={{ fontSize:'13px', color:DIM, lineHeight:1.9 }}>
            성명: <span style={{ color:'rgba(255,255,255,0.55)' }}>[운영자명]</span><br />
            이메일: <span style={{ color:'#818cf8' }}>support@teamcalendar.app</span><br />
            문의 접수 후 영업일 기준 10일 이내 조치합니다.<br />
            <br />
            개인정보 관련 기타 신고·상담은 아래 기관에 문의하실 수 있습니다.<br />
            • 개인정보 침해신고센터: <span style={{ color:'rgba(255,255,255,0.45)' }}>privacy.kisa.or.kr / (국번없이) 118</span><br />
            • 개인정보 분쟁조정위원회: <span style={{ color:'rgba(255,255,255,0.45)' }}>www.kopico.go.kr / 1833-6972</span><br />
            • 경찰청 사이버범죄 신고: <span style={{ color:'rgba(255,255,255,0.45)' }}>ecrm.cyber.go.kr / (국번없이) 182</span>
          </p>
        </div>
      </div>
    </div>
  );
}
