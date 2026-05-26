'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { requestNotificationPermission } from '@/lib/useNotifications';
import { getTasksByUser } from '@/models/taskModel';
import { downloadICS } from '@/lib/exportICS';

function Section({ title, icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <i className={`fas ${icon}`} style={{ color: 'var(--primary)', fontSize: '0.9rem', width: 18, textAlign: 'center' }} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  const [notifPerm,   setNotifPerm]   = useState('default');
  const [name,        setName]        = useState('');
  const [savingName,  setSavingName]  = useState(false);
  const [nameMsg,     setNameMsg]     = useState('');
  const [exporting,   setExporting]   = useState(false);
  const [pwOld,       setPwOld]       = useState('');
  const [pwNew,       setPwNew]       = useState('');
  const [savingPw,    setSavingPw]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission);
    }
    if (user) setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
  }, [user]);

  async function handleRequestNotif() {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true); setNameMsg('');
    const { error } = await getSupabase().auth.updateUser({ data: { name: name.trim() } });
    setNameMsg(error ? `오류: ${error.message}` : '저장되었습니다.');
    setSavingName(false);
    setTimeout(() => setNameMsg(''), 3000);
  }

  async function handleChangePw(e) {
    e.preventDefault();
    if (!pwNew.trim()) return;
    setSavingPw(true); setPwMsg('');
    const { error } = await getSupabase().auth.updateUser({ password: pwNew });
    setPwMsg(error ? `오류: ${error.message}` : '비밀번호가 변경되었습니다.');
    setSavingPw(false);
    if (!error) { setPwOld(''); setPwNew(''); }
    setTimeout(() => setPwMsg(''), 4000);
  }

  async function handleExportAll() {
    if (!user) return;
    setExporting(true);
    try {
      const tasks = await getTasksByUser(user.id);
      if (tasks.length === 0) { alert('내보낼 할일이 없습니다.'); return; }
      downloadICS(tasks, 'teamcalendar_all.ics');
    } finally {
      setExporting(false);
    }
  }

  const NOTIF_STATUS = {
    granted: { label: '허용됨',   color: 'var(--green-500)',  icon: 'fa-bell' },
    denied:  { label: '차단됨',   color: 'var(--red-500)',    icon: 'fa-bell-slash' },
    default: { label: '설정 안됨', color: 'var(--amber-500)', icon: 'fa-bell' },
  };
  const ns = NOTIF_STATUS[notifPerm] || NOTIF_STATUS.default;

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'U';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="view-header">
        <div>
          <h2>설정</h2>
          <p className="view-sub">계정 및 앱 환경설정을 관리하세요</p>
        </div>
      </div>

      <div style={{ padding: '0 20px 40px', maxWidth: 640 }}>

        {/* 프로필 */}
        <Section title="프로필" icon="fa-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '1.2rem', fontWeight: 700, flexShrink: 0,
            }}>
              {avatarLetter}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{displayName}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>{user?.email}</div>
            </div>
          </div>

          <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>표시 이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="이름 입력" onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
            </div>
            <button type="submit" className="btn-primary" disabled={savingName} style={{ flexShrink: 0 }}>
              {savingName ? '저장 중...' : '저장'}
            </button>
          </form>
          {nameMsg && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: nameMsg.startsWith('오류') ? 'var(--red-500)' : 'var(--green-500)' }}>
              {nameMsg}
            </div>
          )}
        </Section>

        {/* 보안 */}
        <Section title="보안" icon="fa-lock">
          <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>새 비밀번호</label>
              <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
                placeholder="새 비밀번호 (8자 이상)" minLength={8}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-secondary" disabled={savingPw || !pwNew}>
                {savingPw ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
          {pwMsg && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: pwMsg.startsWith('오류') ? 'var(--red-500)' : 'var(--green-500)' }}>
              {pwMsg}
            </div>
          )}
        </Section>

        {/* 알림 */}
        <Section title="알림" icon="fa-bell">
          <Row
            label="브라우저 알림"
            sub="마감 시간 · 30분 전 · 1시간 전 알림"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ns.color }}>
                <i className={`fas ${ns.icon}`} style={{ marginRight: 4 }} />
                {ns.label}
              </span>
              {notifPerm !== 'granted' && notifPerm !== 'denied' && (
                <button className="btn-primary btn-sm" onClick={handleRequestNotif}>
                  허용하기
                </button>
              )}
              {notifPerm === 'denied' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                  브라우저 설정에서 해제
                </span>
              )}
            </div>
          </Row>
        </Section>

        {/* 데이터 내보내기 */}
        <Section title="데이터 내보내기" icon="fa-file-export">
          <Row
            label="전체 할일 내보내기"
            sub="모든 할일을 .ics 파일로 다운로드합니다"
          >
            <button className="btn-secondary btn-sm" onClick={handleExportAll} disabled={exporting}>
              <i className="fas fa-download" style={{ marginRight: 6 }} />
              {exporting ? '생성 중...' : 'ICS 다운로드'}
            </button>
          </Row>
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.6 }}>
            <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
            .ics 파일은 Google 캘린더, Apple 캘린더, Outlook 등에서 가져오기로 사용할 수 있습니다.
            <br />기간별 내보내기는 <b>할일</b> 페이지의 내보내기 버튼을 이용하세요.
          </div>
        </Section>

        {/* 계정 관리 */}
        <Section title="계정 관리" icon="fa-circle-user">
          <Row label="로그아웃" sub="현재 기기에서 로그아웃합니다">
            <button className="btn-secondary btn-sm" style={{ color: 'var(--red-500)' }} onClick={signOut}>
              <i className="fas fa-right-from-bracket" style={{ marginRight: 6 }} />
              로그아웃
            </button>
          </Row>
        </Section>

      </div>
    </div>
  );
}
