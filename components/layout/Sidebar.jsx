'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: 'fa-house',          label: '대시보드' },
  { href: '/calendar',  icon: 'fa-calendar-days',  label: '캘린더' },
  { href: '/tasks',     icon: 'fa-list-check',     label: '할일' },
  { href: '/stats',     icon: 'fa-chart-line',     label: '통계' },
  { href: '/tools',        icon: 'fa-wand-magic-sparkles', label: '도구' },
  { href: '/integrations', icon: 'fa-plug',              label: '연동' },
  { href: '/teams',        icon: 'fa-users',             label: '팀' },
  { href: '/alarm',        icon: 'fa-bell',              label: '알람' },
  { href: '/calculator',   icon: 'fa-calculator',        label: '계산기' },
  { href: '/settings',  icon: 'fa-gear',           label: '설정' },
];

export default function Sidebar({ open, collapsed, onClose }) {
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

    </aside>
  );
}
