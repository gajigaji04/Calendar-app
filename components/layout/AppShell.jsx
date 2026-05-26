'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 이동 시 모바일 사이드바 자동 닫기
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div className="flex h-full" style={{ background: 'var(--bg)' }}>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 콘텐츠 영역 */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <Header onMenuClick={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
