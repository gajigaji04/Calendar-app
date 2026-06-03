# TeamCalendar

개인 및 팀의 일정·할일을 한 곳에서 관리하는 풀스택 캘린더 웹 애플리케이션입니다.

## 주요 기능

### 캘린더
- 월·주·연도 뷰 전환
- 드래그 앤 드롭(마우스·터치) 일정 이동
- 기간 일정 span bar 시각화 (date → deadline)
- 날짜 패널: 해당 날짜의 예정 할일 + **오늘 마감** 섹션 (마감일이 그 날인 태스크 별도 표시)
- 한국 공휴일 표시, 요일별 색상 구분

### 할일 관리
- 우선순위(높음·보통·낮음), 카테고리, 색상 태그
- 마감 D-Day 뱃지 (D+, D-Day, D-3 등 단계별)
- 반복 일정 (매일·매주·매월·매년, 종료일 설정)
- 완료 시간(`due_time`) 설정 및 표시
- 필터(전체·오늘·미완료·완료) + 검색 + 정렬(날짜·마감일·우선순위·제목)
- `?open=<id>` URL 파라미터로 특정 태스크 모달 직접 열기
- ICS 파일 내보내기 (기간 선택 또는 전체)
- 스마트 재배치: 과부하 날짜 감지 후 AI 기반 일정 재배치 제안

### 마감 알림
- 헤더 벨 아이콘 — 마감 초과·오늘 마감·7일 이내 3단계 분류
- 알림 항목에서 **인라인 완료 처리** (페이지 이동 없음)
- 알림 항목 클릭 → `/tasks?open=<id>`로 해당 태스크 모달 즉시 열기
- 브라우저 Push 알림: 마감 정시·30분 전·1시간 전·오전 9시 알림
- 설정 페이지에서 알림 전체 ON/OFF 및 유형별 세부 토글, 테스트 알림 전송

### 대시보드
- 오늘 할일 현황, 이번 주 진행률
- 빠른 할일 추가
- 미니 캘린더 (할일 있는 날 점 표시)
- 연속 완료 스트릭 카운터

### 통계
- 요일별·시간대별 완료 패턴 분석
- 최고 생산성 요일·시간대 계산
- 카테고리별 분포

### 도구
- 텍스트·PDF 붙여넣기 → AI가 할일·마감일 자동 추출
- 학생 모드(강의계획서), 직장인 모드(회의록), 개인 모드 지원

### AI 어시스턴트
- Anthropic Claude API 기반 자연어 채팅
- 일정 관련 질의응답 및 할일 제안

### 팀
- 팀 생성·초대, 팀 태스크 공유
- 팀 마감일 알림 통합

### 연동
- **Google Calendar** 양방향 동기화
- **Notion** 데이터베이스 연동
- **Slack** 마감 알림 전송

### 기타
- 다크·라이트 모드 토글
- ICS 파일 Google·Apple·Outlook 캘린더 가져오기 호환
- Stripe 결제 기반 유료 플랜

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19 |
| 데이터베이스 | Supabase (PostgreSQL + Row Level Security) |
| 인증 | Supabase Auth (이메일, 소셜 로그인) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| 결제 | Stripe |
| 스타일 | Tailwind CSS v4 |
| 배포 | Vercel |

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Google Calendar OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=

# Notion OAuth
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

# Slack OAuth
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
```

### 3. Supabase 테이블 설정

`tasks` 테이블에 아래 컬럼이 필요합니다.

```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence      TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_end  DATE,
  ADD COLUMN IF NOT EXISTS recurrence_id   UUID,
  ADD COLUMN IF NOT EXISTS category        TEXT,
  ADD COLUMN IF NOT EXISTS due_time        TIME,
  ADD COLUMN IF NOT EXISTS deadline        DATE,
  ADD COLUMN IF NOT EXISTS color           TEXT,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS notion_page_id  TEXT;

NOTIFY pgrst, 'reload schema';
```

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 확인합니다.

---

## 프로젝트 구조

```
app/
├── (auth)/           # 로그인, 비밀번호 재설정
├── (main)/
│   ├── calendar/     # 월·주·연도 캘린더
│   ├── tasks/        # 할일 목록 (?open=<id> 지원)
│   ├── dashboard/    # 오늘 현황 대시보드
│   ├── stats/        # 생산성 통계
│   ├── tools/        # AI 텍스트 추출 도구
│   ├── chat/         # AI 어시스턴트
│   ├── teams/        # 팀 관리
│   ├── integrations/ # 외부 서비스 연동
│   └── settings/     # 계정·알림·테마 설정
├── api/              # Route Handlers (AI, Stripe, 연동)
├── terms/            # 이용약관
└── privacy/          # 개인정보처리방침

components/
├── layout/           # Header, Sidebar, AppShell, BottomTabBar
├── task/             # TaskModal
├── schedule/         # SmartRescheduleModal
└── widgets/          # AIAssistant, ChatWidget

lib/
├── useDeadlineAlerts.js  # 마감 알림 컨텍스트
├── useNotifications.js   # 브라우저 Push 알림 (유형별 토글)
├── AuthContext.js
├── ThemeContext.js
├── ruleEngine.js
└── scheduleOptimizer.js

models/
├── taskModel.js          # 할일 CRUD, deadline 조회 포함
└── teamTaskModel.js
```

---

## 라이선스

MIT
