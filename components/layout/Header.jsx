'use client';
import { usePathname } from 'next/navigation';

const PAGE_TITLES = {
  '/calendar': '캘린더',
  '/tasks':    '할일',
};

export default function Header({ onMenuClick }) {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES)
    .find(([key]) => pathname.startsWith(key))?.[1] ?? '캘린더';

  return (
    <header className="h-14 flex items-center gap-3 px-4 bg-white border-b border-gray-100 flex-shrink-0">
      {/* 모바일 햄버거 */}
      <button
        onClick={onMenuClick}
        aria-label="메뉴 열기"
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl
          hover:bg-gray-100 transition-colors text-gray-500 text-lg"
      >
        ☰
      </button>

      <span className="font-bold text-gray-900">{title}</span>
    </header>
  );
}
