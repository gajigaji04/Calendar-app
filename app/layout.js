import './globals.css';
import Providers from './Providers';

export const metadata = {
  title: '캘린더 — 개인·팀 일정 관리',
  description: '학생, 직장인, 팀 모두를 위한 스마트 캘린더',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: React 하이드레이션 전에 테마를 적용 */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('tc-theme');
            if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />
        {/*
          SRI(Subresource Integrity): CDN이 변조되더라도 해시가 다르면 브라우저가 로드 거부
          hash는 https://cdnjs.com/libraries/font-awesome/6.5.0 에서 확인 가능
        */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          integrity="sha512-Avb2QiuDEEvB4bZJYdft2mNjVShBftLdPG8FJ0V7irTLQ8Uo0qcPxh4Plq7G5tGm0rU+1SPhVotteLpBERwTkw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
