'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const NAV = [
  { href: '/calendar', emoji: '📅', label: '캘린더' },
  { href: '/tasks',    emoji: '✅', label: '할일' },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';
  const avatar = displayName[0]?.toUpperCase() ?? 'U';

  return (
    <>
      {/* 사이드바 본체 */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-60 flex flex-col z-40',
          'bg-white border-r border-gray-100',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* 로고 */}
        <div className="flex items-center gap-2 h-14 px-5 border-b border-gray-100 flex-shrink-0">
          <span className="text-xl">📅</span>
          <span className="font-extrabold text-gray-900 text-base tracking-tight">캘린더</span>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                <span className="text-base w-5 text-center">{item.emoji}</span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* 유저 섹션 */}
        <div className="px-3 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{displayName}</div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <span className="text-base w-5 text-center">↩</span>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 데스크탑 공간 확보 */}
      <div className="hidden md:block w-60 flex-shrink-0" />
    </>
  );
}
