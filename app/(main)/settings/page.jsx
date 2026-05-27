'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import { requestNotificationPermission } from '@/lib/useNotifications';

function StrengthBar({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter(r => r.test(password)).length;
  const colors = ['var(--red-500)', '#f97316', '#eab308', 'var(--green-500)'];
  const labels = ['너무 짧음', '약함', '보통', '강함'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score - 1] : 'var(--border)',
            transition: 'background .2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '11px', color: colors[score - 1] || 'var(--text-sub)' }}>
        {labels[score - 1] || '비밀번호를 입력하세요'}
      </span>
    </div>
  );
}
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
  const { user, signOut, updatePassword, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [notifPerm,   setNotifPerm]   = useState('default');
  const [name,        setName]        = useState('');
  const [savingName,  setSavingName]  = useState(false);
  const [nameMsg,     setNameMsg]     = useState('');
  const [exporting,   setExporting]   = useState(false);
  const [pwNew,       setPwNew]       = useState('');
  const [pwConfirm,   setPwConfirm]   = useState('');
  const [savingPw,    setSavingPw]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState('');
  const [pwError,     setPwError]     = useState(false);
  const [resetSent,   setResetSent]   = useState(false);

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
    if (pwNew.length < 8) { setPwError(true); setPwMsg('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (pwNew !== pwConfirm) { setPwError(true); setPwMsg('비밀번호가 일치하지 않습니다.'); return; }
    setSavingPw(true); setPwMsg(''); setPwError(false);
    const err = await updatePassword(pwNew);
    if (err) {
      setPwError(true);
      setPwMsg(`오류: ${err.message}`);
    } else {
      setPwError(false);
      setPwMsg('비밀번호가 변경되었습니다.');
      setPwNew(''); setPwConfirm('');
      setTimeout(() => setPwMsg(''), 4000);
    }
    setSavingPw(false);
  }

  async function handleSendReset() {
    if (!user?.email) return;
    const err = await resetPassword(user.email);
    if (!err) setResetSent(true);
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
              <input type="password" value={pwNew} onChange={e => { setPwNew(e.target.value); setPwMsg(''); setPwError(false); }}
                placeholder="새 비밀번호 (8자 이상)"
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
              <StrengthBar password={pwNew} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>비밀번호 확인</label>
              <input type="password" value={pwConfirm} onChange={e => { setPwConfirm(e.target.value); setPwMsg(''); setPwError(false); }}
                placeholder="비밀번호 재입력"
                style={{ borderColor: pwConfirm ? (pwNew === pwConfirm ? 'var(--green-500)' : 'var(--red-500)') : undefined }}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
              {pwConfirm && (
                <div style={{ marginTop: 4, fontSize: '0.75rem', color: pwNew === pwConfirm ? 'var(--green-500)' : 'var(--red-500)' }}>
                  {pwNew === pwConfirm ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-secondary" disabled={savingPw || !pwNew || !pwConfirm}>
                {savingPw ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>

          {pwMsg && (
            <div style={{ marginTop: 10, fontSize: '0.8rem', color: pwError ? 'var(--red-500)' : 'var(--green-500)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>{pwMsg}</span>
              {pwError && !resetSent && (
                <button
                  onClick={handleSendReset}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline', fontFamily: 'inherit' }}>
                  비밀번호 재설정 이메일 받기 →
                </button>
              )}
              {resetSent && (
                <span style={{ color: 'var(--green-500)' }}>📧 재설정 이메일을 보냈습니다.</span>
              )}
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

        {/* 외관 */}
        <Section title="외관" icon="fa-palette">
          <Row label="테마" sub="앱의 색상 모드를 선택하세요">
            <div style={{ display: 'flex', gap: 8 }}>
              {[['light', '라이트', 'fa-sun'], ['dark', '다크', 'fa-moon']].map(([val, label, icon]) => (
                <button key={val}
                  onClick={() => val !== theme && toggleTheme()}
                  className={val === theme ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
                  <i className={`fas ${icon}`} style={{ marginRight: 5 }} />{label}
                </button>
              ))}
            </div>
          </Row>
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
