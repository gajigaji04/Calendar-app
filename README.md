# 📅 스마트 캘린더 앱

> 학생·직장인·팀 모두를 위한 **통합 생산성 플랫폼**  
> Next.js 16 · Supabase · Rule-based AI · 한국어 완전 지원

---

## ✨ 주요 기능

### 🗓 캘린더 & 할일 관리
- **월간 캘린더** — 드래그 앤 드롭으로 일정 이동, 날짜 클릭으로 빠른 추가
- **할일 페이지** — 우선순위(높음·보통·낮음), 카테고리, 마감일, 반복 일정
- **낙관적 업데이트** — 완료 체크 즉시 반영 (서버 응답 대기 없음)
- **키보드 단축키** — `←/→` 월 이동, `t` 오늘, `n` 새 태스크
- **한국 공휴일** 자동 표시 (2025–2026)

### 🤖 스마트 일정 재배치
- 날짜별 **부하 점수** 계산 (높음 3점·보통 2점·낮음 1점)
- **과부하 날**(7점↑) 자동 감지 → 여유 날로 이동 제안
- 마감일 제약 준수, 개별 수락/거절 후 일괄 적용

### 📊 통계 & 패턴 분석
- 기간별 완료율 (7일·30일·90일·전체)
- **요일별 실행 패턴** — 가장 생산적인 요일 자동 추출
- **미루기 감지** — 과부하 점수 0–100, 심각도 배지
- **추세 분석** — 이번 주/이번 달 vs 이전 기간 비교

### 📄 AI 도구 (PDF/텍스트 분석)
- **학생 모드** — 강의계획서·과제 공지에서 시험·과제·발표 자동 추출
- **직장인 모드** — 회의록에서 액션 아이템·결정사항·담당자 추출
- PDF 드래그앤드롭 업로드 (최대 10 MB) 또는 텍스트 직접 붙여넣기
- 추출된 항목 날짜 수정 후 **캘린더에 즉시 추가**

### 🔌 외부 서비스 연동
| 서비스 | 방식 | 기능 |
|--------|------|------|
| **Google Calendar** | OAuth 2.0 | 이벤트 양방향 동기화 (import/export) |
| **Notion** | API 토큰 | 데이터베이스 양방향 동기화 |
| **Slack** | Incoming Webhook | 오늘 요약·마감 임박 알림 전송 |

### 👥 팀 기능
- 팀 생성·초대 코드 참여·멤버 관리
- **공유 캘린더** — 멤버별 색상 구분, 필터 토글
- **리포트 탭** — 팀 완료율, 멤버별 업무량 바 차트, 이번 주 현황
- **일정 충돌 분석** — 동일 날짜 집중 감지 (상위 5일 표시)
- **과부하 감지** — 부하 점수 7점↑ 멤버 알림

### 🔐 보안
- Supabase Auth 기반 이메일/OAuth 로그인
- HTTPS 강제 적용 (HSTS 2년), CSP, X-Frame-Options 등 보안 헤더
- Open Redirect 방어, 암호학적 초대코드 생성 (`crypto.getRandomValues`)

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 인증·DB | Supabase (PostgreSQL + Auth + RLS) |
| 스타일 | CSS Variables, Tailwind CSS 4 (보조) |
| PDF 파싱 | pdf-parse (Node.js runtime) |
| 외부 연동 | Google Calendar REST API, Notion API, Slack Webhooks |
| 언어 | JavaScript (일부 TypeScript) |

---

## 🚀 로컬 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env.local` 파일을 생성하고 아래 값을 채웁니다:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Google Calendar 연동 (선택)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 데이터베이스 마이그레이션
Supabase Dashboard → SQL Editor에서 순서대로 실행:
```
supabase/migrations/001_tasks.sql
supabase/migrations/002_teams.sql
supabase/migrations/003_integrations.sql
```

### 4. 개발 서버 실행
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

---

## 📁 프로젝트 구조

```
calendar-app/
├── app/
│   ├── (main)/
│   │   ├── calendar/        # 월간 캘린더
│   │   ├── tasks/           # 할일 목록
│   │   ├── stats/           # 통계 & 패턴 분석
│   │   ├── tools/           # AI 도구 (PDF 분석)
│   │   ├── integrations/    # 외부 서비스 연동
│   │   ├── teams/           # 팀 목록
│   │   │   └── [id]/        # 팀 상세 (캘린더·리포트·멤버)
│   │   └── settings/        # 계정·알림·보안 설정
│   ├── api/
│   │   ├── parse-pdf/       # PDF 텍스트 추출 API
│   │   └── integrations/    # Google·Notion·Slack 연동 API
│   └── auth/callback/       # OAuth 콜백
├── components/
│   ├── layout/              # AppShell·Header·Sidebar·BottomTabBar
│   ├── schedule/            # SmartRescheduleModal
│   └── task/                # TaskModal
├── lib/
│   ├── scheduleOptimizer.js # 스마트 재배치 엔진
│   ├── textAnalyzer.js      # 한국어 텍스트 분석 엔진
│   └── integrations/        # Google·Notion·Slack 헬퍼
├── models/
│   ├── taskModel.js
│   └── teamModel.js
└── supabase/migrations/     # SQL 마이그레이션 파일
```

---

## 🌐 배포 (Vercel)

```bash
# 프로덕션 빌드 확인
npm run build

# Vercel CLI 배포
vercel --prod
```

Vercel 환경변수에 `.env.local`의 값을 동일하게 설정하세요.  
Google Calendar 연동 사용 시 `NEXT_PUBLIC_APP_URL`을 실제 도메인으로 변경하고  
Google Cloud Console에서 리디렉션 URI를 `https://your-domain.com/api/integrations/google/callback`으로 등록하세요.

---

## 📝 라이선스

MIT
