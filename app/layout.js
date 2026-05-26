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
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
