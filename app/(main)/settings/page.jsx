'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { getSupabase } from '@/lib/supabase';
import { requestNotificationPermission, getNotifSettings, setNotifSetting } from '@/lib/useNotifications';
import { useRouter } from 'next/navigation';

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

/* ── 구독 플랜 섹션 ─────────────────────────────── */
const PLAN_INFO = {
  free: { label: '무료',  color: 'var(--text-sub)',      bg: 'var(--bg-sub,rgba(0,0,0,0.04))', icon: 'fa-gift',  limit: 50 },
  pro:  { label: 'Pro',   color: '#6366f1',               bg: 'rgba(99,102,241,0.07)',           icon: 'fa-bolt',  limit: Infinity },
  team: { label: 'Team',  color: '#8b5cf6',               bg: 'rgba(139,92,246,0.07)',           icon: 'fa-users', limit: Infinity },
};

function PlanSection({ user }) {
  const router = useRouter();
  const [plan,      setPlan]      = useState('free');
  const [taskCount, setTaskCount] = useState(0);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    Promise.all([
      sb.from('user_plans').select('plan').eq('user_id', user.id).maybeSingle(),
      sb.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart),
    ]).then(([planRes, countRes]) => {
      setPlan(planRes.data?.plan ?? 'free');
      setTaskCount(countRes.count ?? 0);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-sub)' }}><i className="fas fa-spinner fa-spin" /></div>;

  const info       = PLAN_INFO[plan] ?? PLAN_INFO.free;
  const usagePct   = info.limit === Infinity ? 0 : Math.min(100, Math.round(taskCount / info.limit * 100));
  const nearLimit  = info.limit !== Infinity && taskCount >= info.limit * 0.8;
  const hitLimit   = info.limit !== Infinity && taskCount >= info.limit;

  return (
    <div>
      {/* 현재 플랜 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: info.bg, border: `1px solid ${info.color}50`, marginBottom: 16 }}>
        <i className={`fas ${info.icon}`} style={{ color: info.color, fontSize: '1.1rem' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            {info.label} 플랜
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: 2, color: plan === 'free' ? 'var(--text-sub)' : info.color, fontWeight: plan === 'free' ? 400 : 600 }}>
            {plan === 'free' ? '더 많은 기능이 필요하신가요?' : '모든 기능 사용 가능'}
          </div>
        </div>
        {plan === 'free' && (
          <button className="btn-primary btn-sm" onClick={() => router.push('/pricing')}>
            <i className="fas fa-arrow-up" style={{ marginRight: 5 }} />업그레이드
          </button>
        )}
      </div>

      {/* 무료 플랜 사용량 */}
      {plan === 'free' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>이번 달 할일 사용량</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: nearLimit ? (hitLimit ? 'var(--red-500)' : '#f97316') : 'var(--text)' }}>
                {taskCount} / {info.limit}개
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${usagePct}%`, borderRadius: 999,
                background: hitLimit ? 'var(--red-500)' : nearLimit ? '#f97316' : 'var(--indigo-600)',
                transition: 'width .4s ease',
              }} />
            </div>
            {nearLimit && (
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: hitLimit ? 'var(--red-500)' : '#f97316', fontWeight: 600 }}>
                <i className="fas fa-triangle-exclamation" style={{ marginRight: 4 }} />
                {hitLimit ? '이번 달 한도에 도달했습니다. 새 할일을 추가하려면 업그레이드하세요.' : `이번 달 한도의 ${usagePct}%를 사용했습니다.`}
              </div>
            )}
          </div>

          {/* 업그레이드 혜택 */}
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 10, fontSize: '0.85rem' }}>
              Pro 업그레이드 혜택
            </div>
            {[
              ['fa-infinity',       '무제한 할일 & 팀 멤버'],
              ['fa-rotate',         '반복 일정 + 주간·연도 뷰'],
              ['fa-plug',           'Google Calendar · Notion · Slack 연동'],
              ['fa-robot',          'AI 스마트 재조정 & PDF 파싱'],
              ['fa-chart-line',     '고급 통계 & 생산성 분석'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                <i className={`fas ${icon}`} style={{ color: 'var(--indigo-600)', width: 14, textAlign: 'center', fontSize: '0.75rem' }} />
                {text}
              </div>
            ))}
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 10, justifyContent: 'center', fontSize: '0.88rem' }}
              onClick={() => router.push('/pricing')}
            >
              Pro 플랜 시작 · ₩2,990/월 →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut, updatePassword, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [notifPerm,   setNotifPerm]   = useState('default');
  const [notifSettings, setNotifSettings] = useState({ enabled: true, atTime: true, before30: true, before60: true, morning: true });
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
    setNotifSettings(getNotifSettings());
    if (user) setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
  }, [user]);

  function handleNotifToggle(key, value) {
    setNotifSetting(key, value);
    setNotifSettings(getNotifSettings());
  }

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

        {/* 구독 & 플랜 */}
        <Section title="구독 & 플랜" icon="fa-crown">
          <PlanSection user={user} />
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
          <Row label="브라우저 알림 권한" sub="알림을 받으려면 브라우저 권한이 필요합니다">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ns.color }}>
                <i className={`fas ${ns.icon}`} style={{ marginRight: 4 }} />
                {ns.label}
              </span>
              {notifPerm !== 'granted' && notifPerm !== 'denied' && (
                <button className="btn-primary btn-sm" onClick={handleRequestNotif}>허용하기</button>
              )}
              {notifPerm === 'denied' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                  브라우저 주소창 자물쇠 → 알림 허용
                </span>
              )}
            </div>
          </Row>

          {notifPerm === 'granted' && (
            <>
              <Row label="알림 전체 켜기/끄기" sub="모든 알림을 일괄 제어합니다">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div
                    onClick={() => handleNotifToggle('tc-notif-enabled', !notifSettings.enabled)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                      background: notifSettings.enabled ? 'var(--indigo-600)' : 'var(--border)',
                      position: 'relative', transition: 'background .2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: notifSettings.enabled ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600 }}>
                    {notifSettings.enabled ? 'ON' : 'OFF'}
                  </span>
                </label>
              </Row>

              {notifSettings.enabled && (
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', marginTop: 4 }}>
                  {[
                    { key: 'tc-notif-at',      stateKey: 'atTime',   label: '마감 시간 알림',   sub: '정시에 알림' },
                    { key: 'tc-notif-30m',     stateKey: 'before30', label: '30분 전 알림',     sub: '마감 30분 전' },
                    { key: 'tc-notif-60m',     stateKey: 'before60', label: '1시간 전 알림',    sub: '마감 1시간 전' },
                    { key: 'tc-notif-morning', stateKey: 'morning',  label: '오전 9시 알림',    sub: '오늘 할일 · 오늘 마감일 알림' },
                  ].map(({ key, stateKey, label, sub }) => (
                    <Row key={key} label={label} sub={sub}>
                      <div
                        onClick={() => handleNotifToggle(key, !notifSettings[stateKey])}
                        style={{
                          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                          background: notifSettings[stateKey] ? 'var(--indigo-600)' : 'var(--border)',
                          position: 'relative', transition: 'background .2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2, left: notifSettings[stateKey] ? 18 : 2,
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                        }} />
                      </div>
                    </Row>
                  ))}
                  <div style={{ padding: '10px 0 4px' }}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        if (Notification.permission === 'granted') {
                          new Notification('📋 테스트 알림', { body: 'TeamCalendar 알림이 정상 작동합니다!', icon: '/favicon.ico' });
                        }
                      }}
                    >
                      <i className="fas fa-paper-plane" style={{ marginRight: 6 }} />
                      테스트 알림 보내기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
