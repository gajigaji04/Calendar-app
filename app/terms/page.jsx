import Link from 'next/link';

const TEXT  = '#f0f0ff';
const MUTED = 'rgba(255,255,255,0.5)';
const DIM   = 'rgba(255,255,255,0.28)';

const SECTIONS = [
  {
    title: '제1조 (목적)',
    body: `이 약관은 TeamCalendar(이하 "서비스")가 제공하는 캘린더 및 일정 관리 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (이용자의 가입 및 자격)',
    body: `① 이용자는 서비스에서 정한 절차에 따라 회원 가입을 신청하고, 서비스가 이를 승인함으로써 회원이 됩니다.\n② 만 14세 미만의 아동은 법정대리인의 동의 없이 서비스를 이용할 수 없습니다.\n③ 서비스는 다음 각 호에 해당하는 경우 가입 승인을 거부하거나 사후 취소할 수 있습니다.\n  - 타인의 정보를 도용하여 가입한 경우\n  - 허위 정보를 기재한 경우\n  - 서비스 운영을 방해할 목적으로 가입한 경우`,
  },
  {
    title: '제3조 (서비스의 내용)',
    body: `서비스는 다음과 같은 기능을 제공합니다.\n① 개인 캘린더 및 일정 관리\n② 할일(투두) 목록 관리\n③ 마감 전 알림 기능\n④ 팀 캘린더 공유 및 협업 (유료 플랜)\n⑤ 기타 서비스가 추가·개발하는 기능`,
  },
  {
    title: '제4조 (이용자의 의무)',
    body: `이용자는 다음 행위를 해서는 안 됩니다.\n① 타인의 개인정보 도용 또는 사칭\n② 서비스의 운영을 방해하는 행위\n③ 악성 코드, 스팸 등 유해 콘텐츠 업로드\n④ 서비스를 이용한 불법 행위 또는 제3자의 권리 침해\n⑤ 서비스를 상업적 목적으로 무단 이용하는 행위`,
  },
  {
    title: '제5조 (서비스의 변경 및 중단)',
    body: `① 서비스는 운영상 필요에 따라 서비스의 내용을 변경할 수 있으며, 이 경우 사전 공지를 원칙으로 합니다.\n② 천재지변, 시스템 장애 등 불가피한 사정이 있는 경우 서비스 제공을 일시 중단할 수 있습니다.\n③ 서비스는 무료로 제공되는 서비스의 일부 또는 전부를 언제든지 변경하거나 종료할 수 있습니다.`,
  },
  {
    title: '제6조 (개인정보 보호)',
    body: `서비스는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 수집·이용·보관 등에 관한 사항은 별도의 개인정보처리방침에서 정합니다.`,
  },
  {
    title: '제7조 (면책 조항)',
    body: `① 서비스는 천재지변, 전쟁, 테러, 정부 기관의 규제 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.\n② 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 서비스는 책임지지 않습니다.\n③ 서비스는 이용자가 게시한 정보, 자료, 사실의 신뢰도·정확성에 관한 책임을 지지 않습니다.`,
  },
  {
    title: '제8조 (준거법 및 관할)',
    body: `이 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련된 분쟁은 대한민국 법원을 관할 법원으로 합니다.`,
  },
];

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#070711',
      color: TEXT,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'20px 0', background:'rgba(7,7,17,0.9)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:10 }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex items-center justify-between">
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
      <div className="max-w-3xl mx-auto px-5 sm:px-8" style={{ paddingTop:'60px', paddingBottom:'96px' }}>
        <div style={{ marginBottom:'48px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:'999px', padding:'4px 12px', marginBottom:'16px', fontSize:'11px', fontWeight:700, color:'#a5b4fc', letterSpacing:'0.05em' }}>
            법적 고지
          </div>
          <h1 style={{ fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:'12px' }}>
            이용약관
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
          <p style={{ fontSize:'13px', color:DIM, lineHeight:1.7 }}>
            본 약관에 관한 문의는 <span style={{ color:'#818cf8' }}>support@teamcalendar.app</span> 으로 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
