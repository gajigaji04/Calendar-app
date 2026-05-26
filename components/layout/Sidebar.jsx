'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: 'fa-house',          label: '대시보드' },
  { href: '/calendar',  icon: 'fa-calendar-days',  label: '캘린더' },
  { href: '/tasks',     icon: 'fa-list-check',     label: '할일' },
  { href: '/teams',     icon: 'fa-users',          label: '팀' },
  { href: '/settings',  icon: 'fa-gear',           label: '설정' },
];

export default function Sidebar({ open, collapsed, onToggleCollapse, onClose }) {
  const pathname = usePathname();

  return (
    <aside className={`app-sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
      {/* 내비게이션 */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`nav-item${active ? ' active' : ''}${collapsed ? ' centered' : ''}`}
            >
              <i className={`fas ${item.icon} nav-icon`} />
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && <span className="nav-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* 접기/펼치기 토글 */}
      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className={`sidebar-toggle${collapsed ? ' centered' : ''}`}
        >
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'left'}`}
            style={{ fontSize: '0.75rem', flexShrink: 0 }} />
          {!collapsed && <span>접기</span>}
        </button>
      </div>
    </aside>
  );
}
