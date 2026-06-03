'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useDeadlineAlerts } from '@/lib/useDeadlineAlerts';
import { useTheme } from '@/lib/ThemeContext';
import { toggleComplete } from '@/models/taskModel';

function Logo({ size = 28, gradId = 'hdrLg' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <rect x="8" y="14" width="24" height="1.5" rx=".75" fill="rgba(255,255,255,0.28)" />
      <rect x="12.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="24.5" y="8" width="3" height="8" rx="1.5" fill="rgba(255,255,255,0.92)" />
      <rect x="8"    y="19.5" width="13"   height="3" rx="1.5" fill="rgba(255,255,255,0.88)" />
      <rect x="23.5" y="19.5" width="8.5"  height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="8"    y="25.5" width="8"    height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="18.5" y="25.5" width="13.5" height="3" rx="1.5" fill="rgba(255,255,255,0.65)" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AlertSection({ label, color, bg, tasks, onTaskClick, onToggle }) {
  return (
    <div>
      <div style={{ padding: '5px 14px', fontSize: '0.71rem', fontWeight: 700, color, background: bg }}>
        {label} ({tasks.length})
      </div>
      {tasks.map(t => (
        <div
          key={t.id}
          onClick={() => onTaskClick(t)}
          style={{
            padding: '8px 14px', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', transition: 'background .1s',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}
        >
          <button
            onClick={e => { e.stopPropagation(); onToggle(t); }}
            title="완료 처리"
            style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--border)',
              background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.6rem', transition: 'all .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-check" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.title}
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--text-sub)', marginTop: 2 }}>
              <i className="fas fa-flag" style={{ marginRight: 4, color }} />
              마감 {t.deadline}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Header({ onMenuClick }) {
  const { user, signOut } = useAuth();
  const { overdue, dueToday, soon, urgentCount, refresh } = useDeadlineAlerts();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [dropOpen, setDropOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  function handleTaskClick(task) {
    setBellOpen(false);
    router.push(`/tasks?open=${task.id}`);
  }

  async function handleToggle(task) {
    await toggleComplete(task.id, task.completed);
    refresh();
  }

  const dropRef = useRef(null);
  const bellRef = useRef(null);

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  useEffect(() => {
    function handleOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const totalAlerts = overdue.length + dueToday.length + soon.length;

  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', background: 'var(--surface)',
      borderBottom: '1px solid var(--border)', flexShrink: 0, zIndex: 30,
    }}>
      {/* 좌측: 햄버거 + 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="hdr-hamburger"
          onClick={onMenuClick}
          aria-label="메뉴"
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-sub)', fontSize: '1rem',
          }}
        >
          <i className="fas fa-bars" />
        </button>

        <Link href="/calendar" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Logo size={28} gradId="hdrLg" />
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Team<span style={{ color: '#6366f1' }}>Calendar</span>
          </span>
        </Link>
      </div>

      {/* 우측: 테마 토글 + 벨 + 계정 드롭다운 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* 다크/라이트 모드 토글 */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme === 'dark' ? '#fbbf24' : 'var(--text-sub)',
            fontSize: '0.9rem', transition: 'background .15s, color .15s',
          }}
        >
          <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`} />
        </button>

        {/* 마감 알림 벨 */}
        <div style={{ position: 'relative' }} ref={bellRef}>
          <button
            onClick={() => { setBellOpen(p => !p); setDropOpen(false); }}
            style={{
              position: 'relative', width: 36, height: 36, borderRadius: 10,
              border: '1px solid var(--border)',
              background: bellOpen ? 'var(--bg)' : 'var(--surface)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: urgentCount > 0 ? 'var(--amber-500)' : 'var(--text-sub)', fontSize: '0.9rem',
              transition: 'background .15s',
            }}
            title="마감 알림"
          >
            <i className="fas fa-bell" />
            {urgentCount > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                minWidth: 14, height: 14, borderRadius: 7,
                background: 'var(--red-500)', color: '#fff',
                fontSize: '0.55rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {urgentCount > 9 ? '9+' : urgentCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: 'var(--shadow-lg)',
              width: 290, zIndex: 50, overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 14px 10px', borderBottom: '1px solid var(--border)',
                fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="fas fa-bell" style={{ color: 'var(--amber-500)', fontSize: '0.8rem' }} />
                마감 알림
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {totalAlerts === 0 ? (
                  <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                    <i className="fas fa-check-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: 8, color: 'var(--border)' }} />
                    다가오는 마감 일정이 없습니다
                  </div>
                ) : (
                  <>
                    {overdue.length > 0 && (
                      <AlertSection label="마감 초과" color="var(--red-500)" bg="rgba(239,68,68,0.07)" tasks={overdue} onTaskClick={handleTaskClick} onToggle={handleToggle} />
                    )}
                    {dueToday.length > 0 && (
                      <AlertSection label="오늘 마감" color="var(--amber-500)" bg="rgba(245,158,11,0.07)" tasks={dueToday} onTaskClick={handleTaskClick} onToggle={handleToggle} />
                    )}
                    {soon.length > 0 && (
                      <AlertSection label="7일 이내" color="var(--indigo-600)" bg="rgba(99,102,241,0.07)" tasks={soon} onTaskClick={handleTaskClick} onToggle={handleToggle} />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 계정 드롭다운 */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => { setDropOpen(p => !p); setBellOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px 5px 5px', borderRadius: 12,
              border: '1px solid var(--border)',
              background: dropOpen ? 'var(--bg)' : 'var(--surface)',
              cursor: 'pointer', transition: 'background .15s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            }}>
              {avatarLetter}
            </div>
            <span style={{
              fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)',
              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
            <i className="fas fa-chevron-down" style={{
              fontSize: '0.58rem', color: 'var(--text-sub)',
              transition: 'transform .2s',
              transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, boxShadow: 'var(--shadow-lg)',
              minWidth: 210, zIndex: 50, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {avatarLetter}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/settings" className="hdr-drop-item" onClick={() => setDropOpen(false)}>
                <i className="fas fa-gear" style={{ width: 16, textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem' }} />
                설정
              </Link>

              <div style={{ borderTop: '1px solid var(--border)' }}>
                <button className="hdr-drop-item danger" onClick={() => { setDropOpen(false); signOut(); }}>
                  <i className="fas fa-right-from-bracket" style={{ width: 16, textAlign: 'center', fontSize: '0.85rem' }} />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
