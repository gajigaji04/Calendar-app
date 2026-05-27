'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: 'fa-house',        label: '홈' },
  { href: '/calendar',  icon: 'fa-calendar-days', label: '캘린더' },
  { href: '/tasks',     icon: 'fa-list-check',    label: '할일' },
  { href: '/stats',     icon: 'fa-chart-line',    label: '통계' },
  { href: '/settings',  icon: 'fa-gear',          label: '설정' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="bottom-tab-bar">
      {NAV.map(item => {
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`bottom-tab${active ? ' active' : ''}`}>
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
