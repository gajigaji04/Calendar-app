'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useNotifications } from '@/lib/useNotifications';
import { DeadlineAlertsProvider } from '@/lib/useDeadlineAlerts';

export default function AppShell({ children }) {
  const [sidebarOpen,     setSidebarOpen]     = useState(false);   // mobile slide
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);  // desktop collapse
  const pathname = usePathname();
  useNotifications();

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <DeadlineAlertsProvider>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 전체 폭 헤더 */}
      <Header onMenuClick={() => setSidebarOpen(p => !p)} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 모바일 오버레이 */}
        <div
          className={`app-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* 사이드바 */}
        <Sidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          onClose={() => setSidebarOpen(false)}
        />

        {/* 메인 콘텐츠 */}
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
    </DeadlineAlertsProvider>
  );
}
