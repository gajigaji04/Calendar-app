import Link from 'next/link';

const TEXT  = '#f0f0ff';
const MUTED = 'rgba(255,255,255,0.5)';
const DIM   = 'rgba(255,255,255,0.28)';

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: `TeamCalendar는 서비스 이용을 위해 아래와 같은 개인정보를 수집합니다.\n\n[필수 항목]\n- 이메일 주소\n- 비밀번호 (암호화 저장)\n- 이름 (닉네임)\n\n[소셜 로그인 시 자동 수집]\n- 제공자(Google, GitHub, Kakao)로부터 이메일, 이름, 프로필 이미지\n\n[서비스 이용 중 생성되는 정보]\n- 일정 및 할일 데이터\n- 접속 로그, 기기 정보`,
  },
  {
    title: '2. 개인정보 수집 및 이용 목적',
    body: `수집한 개인정보는 다음의 목적으로만 이용됩니다.\n① 회원 식별 및 로그인 처리\n② 서비스 제공 및 운영 (캘린더, 할일, 알림 등)\n③ 고객 문의 및 불만 처리\n④ 서비스 개선을 위한 통계 분석\n⑤ 법령에 따른 의무 이행`,
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    body: `개인정보는 서비스 이용 계약 유지 기간 동안 보유합니다. 회원 탈퇴 시 지체 없이 파기하되, 관련 법령에 따라 일정 기간 보관이 필요한 경우는 예외로 합니다.\n\n[법령에 의한 보유]\n- 전자상거래 관련 기록: 5년 (전자상거래법)\n- 로그인 기록: 3개월 (통신비밀보호법)`,
  },
  {
    title: '4. 개인정보의 제3자 제공',
    body: `TeamCalendar는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 다음의 경우는 예외입니다.\n① 이용자가 사전에 동의한 경우\n② 법령의 규정에 따라 수사 기관의 요청이 있는 경우`,
  },
  {
    title: '5. 개인정보 처리 위탁',
    body: `서비스는 원활한 운영을 위해 아래 업체에 개인정보 처리를 위탁하고 있습니다.\n\n- Supabase Inc.: 데이터베이스 저장 및 인증 처리\n- Vercel Inc.: 서비스 호스팅 및 배포\n\n위탁 계약 시 개인정보 보호 관련 법규의 준수를 요구하고 있습니다.`,
  },
  {
    title: '6. 이용자의 권리',
    body: `이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n① 개인정보 열람 요청\n② 개인정보 정정·삭제 요청\n③ 개인정보 처리 정지 요청\n④ 회원 탈퇴 (서비스 내 설정에서 직접 처리)\n\n위 권리 행사는 support@teamcalendar.app 으로 문의해 주세요.`,
  },
  {
    title: '7. 개인정보 보호를 위한 기술적 조치',
    body: `TeamCalendar는 이용자의 개인정보를 보호하기 위해 다음과 같은 조치를 취하고 있습니다.\n① 비밀번호 단방향 암호화 저장 (bcrypt)\n② Row Level Security (RLS)로 데이터 접근 제어\n③ HTTPS 통신 암호화\n④ Supabase 인증 토큰 기반 세션 관리`,
  },
  {
    title: '8. 개인정보 처리방침 변경',
    body: `본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있습니다. 변경 시 서비스 내 공지사항 또는 이메일을 통해 사전 고지합니다.`,
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
            시행일: 2026년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2026년 5월 26일
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
          <p style={{ fontSize:'13.5px', fontWeight:700, color:TEXT, marginBottom:'6px' }}>개인정보 보호 책임자</p>
          <p style={{ fontSize:'13px', color:DIM, lineHeight:1.7 }}>
            이메일: <span style={{ color:'#818cf8' }}>support@teamcalendar.app</span><br />
            문의 접수 후 영업일 기준 3일 이내 답변 드립니다.
          </p>
        </div>
      </div>
    </div>
  );
}
