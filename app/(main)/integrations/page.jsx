'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

/* useSearchParams()는 Suspense boundary 안에서만 사용 가능 */
function BannerFromUrl({ onBanner }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error     = searchParams.get('error');
    if (connected === 'google') {
      onBanner({ type: 'success', message: 'Google Calendar 연결에 성공했습니다! 이제 동기화할 수 있습니다.' });
    } else if (error) {
      onBanner({ type: 'error', message: `연동 오류: ${decodeURIComponent(error)}` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  return null;
}

// ─── 헬퍼 ─────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── StatusDot ────────────────────────────────────────────
function StatusDot({ connected }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: connected ? 'var(--green-500,#22c55e)' : 'var(--border)',
        boxShadow: connected ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
      }} />
      <span style={{ fontSize: '0.77rem', color: connected ? 'var(--green-500)' : 'var(--text-muted,#9ca3af)' }}>
        {connected ? '연결됨' : '미연결'}
      </span>
    </span>
  );
}

// ─── SectionHeader ────────────────────────────────────────
function SectionHeader({ icon, label, color, connected, lastSync }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: color + '18',
          border: `1px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: '1rem' }} />
        </div>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text)' }}>{label}</span>
          {lastSync && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted,#9ca3af)', margin: 0 }}>
              마지막 동기화: {formatDate(lastSync)}
            </p>
          )}
        </div>
      </div>
      <StatusDot connected={connected} />
    </div>
  );
}

// ─── 스피너 ───────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.3)`,
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin-slow .7s linear infinite',
    }} />
  );
}

// ─── 알림 배너 ────────────────────────────────────────────
function Banner({ type, message, onClose }) {
  const colors = {
    success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  text: 'var(--green-500)',  icon: 'fa-circle-check' },
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: 'var(--red-500)',    icon: 'fa-circle-exclamation' },
    info:    { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', text: 'var(--indigo-400)', icon: 'fa-circle-info' },
  };
  const c = colors[type] ?? colors.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 10, marginBottom: 16,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <i className={`fas ${c.icon}`} style={{ color: c.text, marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: '0.84rem', color: 'var(--text)', flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: 0 }}>
          <i className="fas fa-times" style={{ fontSize: '0.75rem' }} />
        </button>
      )}
    </div>
  );
}

// ─── 안내 토글 ────────────────────────────────────────────
function GuideToggle({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: '0.77rem', color: 'var(--indigo-400,#818cf8)', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
        }}
      >
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }} />
        발급 방법 보기
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: '12px 14px', borderRadius: 10,
          background: 'var(--bg-sub,rgba(0,0,0,0.04))', border: '1px solid var(--border)',
          fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.7,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ① Google Calendar 카드
// ────────────────────────────────────────────────────────────
function GoogleCard({ status, googleConfigured, onRefresh }) {
  const [syncing, setSyncing] = useState(false);
  const [result,  setResult]  = useState('');

  const connected = !!status?.connected;
  const lastSync  = status?.last_synced_at;

  async function handleSync(direction) {
    setSyncing(true); setResult('');
    try {
      const res = await fetch('/api/integrations/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (direction === 'import') {
        setResult(`✅ Google Calendar에서 ${json.imported}개 가져왔습니다 (${json.skipped}개 중복 제외)`);
      } else {
        setResult(`✅ ${json.exported}개 태스크를 Google Calendar에 내보냈습니다`);
      }
      onRefresh();
    } catch (e) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Google Calendar 연결을 해제하시겠습니까?')) return;
    await fetch('/api/integrations/google/sync', { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <SectionHeader
        icon="fa-brands fa-google" label="Google Calendar"
        color="#4285F4" connected={connected} lastSync={lastSync}
      />

      {result && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem',
          background: result.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: result.startsWith('✅') ? 'var(--green-500)' : 'var(--red-500)',
        }}>
          {result}
        </div>
      )}

      {!googleConfigured ? (
        <div style={{
          padding: '10px 14px', borderRadius: 9,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
          fontSize: '0.82rem', color: 'var(--text-sub)', lineHeight: 1.55,
        }}>
          <i className="fas fa-triangle-exclamation" style={{ color: '#f59e0b', marginRight: 7 }} />
          서비스 관리자가 Google OAuth를 아직 설정하지 않았습니다. 잠시 후 다시 시도하세요.
        </div>
      ) : !connected ? (
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 14, lineHeight: 1.5 }}>
            Google 계정으로 로그인하면 Calendar 이벤트를 양방향으로 동기화할 수 있습니다.
          </p>
          <a
            href="/api/integrations/google/auth"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 9, textDecoration: 'none',
              background: '#4285F4', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
            }}
          >
            <i className="fab fa-google" />
            Google로 연결하기
          </a>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 12 }}>
            앞으로 30일간의 Google Calendar 이벤트를 가져오거나, 이 앱의 태스크를 Google Calendar에 추가합니다.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button className="btn-primary" onClick={() => handleSync('import')} disabled={syncing} style={{ fontSize: '0.83rem', padding: '8px 16px' }}>
              {syncing ? <Spinner /> : <i className="fas fa-cloud-arrow-down" style={{ marginRight: 7 }} />}
              Google → 앱 가져오기
            </button>
            <button className="btn-secondary" onClick={() => handleSync('export')} disabled={syncing} style={{ fontSize: '0.83rem', padding: '8px 16px' }}>
              {syncing ? <Spinner size={14} /> : <i className="fas fa-cloud-arrow-up" style={{ marginRight: 7 }} />}
              앱 → Google 내보내기
            </button>
          </div>
          <button onClick={handleDisconnect} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--red-500)', padding: 0, fontFamily: 'inherit' }}>
            <i className="fas fa-unlink" style={{ marginRight: 5 }} />연결 해제
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ② Notion 카드
// ────────────────────────────────────────────────────────────
function NotionCard({ status, onRefresh }) {
  const [token,      setToken]      = useState('');
  const [dbId,       setDbId]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [result,     setResult]     = useState('');
  const [showForm,   setShowForm]   = useState(false);

  const connected  = !!status?.connected;
  const dbTitle    = status?.settings?.databaseTitle;
  const lastSync   = status?.last_synced_at;

  async function handleConnect(e) {
    e.preventDefault();
    setSaving(true); setResult('');
    try {
      const res = await fetch('/api/integrations/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), databaseId: dbId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(`✅ "${json.database.title}" 연결 완료`);
      setShowForm(false);
      onRefresh();
    } catch (e) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(direction) {
    setSyncing(true); setResult('');
    try {
      const res = await fetch('/api/integrations/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (direction === 'import') setResult(`✅ Notion에서 ${json.imported}개 가져왔습니다`);
      else setResult(`✅ ${json.exported}개를 Notion에 내보냈습니다`);
      onRefresh();
    } catch (e) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Notion 연결을 해제하시겠습니까?')) return;
    await fetch('/api/integrations/notion', { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <SectionHeader
        icon="fa-n" label="Notion"
        color="#e2e8f0" connected={connected} lastSync={lastSync}
      />

      {result && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem',
          background: result.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: result.startsWith('✅') ? 'var(--green-500)' : 'var(--red-500)',
        }}>
          {result}
        </div>
      )}

      {!connected || showForm ? (
        <form onSubmit={handleConnect}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 10, lineHeight: 1.5 }}>
            Notion Integration Token과 동기화할 데이터베이스 ID를 입력하세요.
          </p>
          <GuideToggle>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li><a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--indigo-400,#818cf8)' }}>notion.so/my-integrations</a> 접속 → <strong>새 API 통합 만들기</strong></li>
              <li>이름 입력 후 저장 → <strong>내부 통합 시크릿</strong> 복사 (<code>secret_xxx...</code>)</li>
              <li>Notion에서 동기화할 데이터베이스 페이지 열기</li>
              <li>우측 상단 <strong>···</strong> → <strong>연결 추가</strong> → 방금 만든 통합 선택</li>
              <li>데이터베이스 URL에서 ID 복사: <code>notion.so/<strong>여기32자</strong>?v=...</code></li>
            </ol>
          </GuideToggle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Integration Token
              </label>
              <input
                type="password"
                placeholder="secret_xxxxxxxx..."
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                className="input-field"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Database ID
              </label>
              <input
                type="text"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={dbId}
                onChange={e => setDbId(e.target.value)}
                required
                className="input-field"
              />
              <p style={{ fontSize: '0.71rem', color: 'var(--text-muted,#9ca3af)', marginTop: 4 }}>
                데이터베이스 URL에서 <code>notion.so/xxxxxxxx</code> 부분 (32자 hex)
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: '0.83rem', padding: '8px 16px' }}>
              {saving ? <Spinner /> : <i className="fas fa-plug" style={{ marginRight: 7 }} />}
              연결 테스트 및 저장
            </button>
            {showForm && (
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{ fontSize: '0.83rem' }}>
                취소
              </button>
            )}
          </div>
        </form>
      ) : (
        <div>
          {dbTitle && (
            <p style={{ fontSize: '0.83rem', color: 'var(--text)', marginBottom: 12 }}>
              <i className="fas fa-database" style={{ marginRight: 6, color: 'var(--text-sub)' }} />
              {dbTitle}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              className="btn-primary"
              onClick={() => handleSync('import')}
              disabled={syncing}
              style={{ fontSize: '0.83rem', padding: '8px 16px' }}
            >
              {syncing ? <Spinner /> : <i className="fas fa-cloud-arrow-down" style={{ marginRight: 7 }} />}
              Notion → 앱 가져오기
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSync('export')}
              disabled={syncing}
              style={{ fontSize: '0.83rem', padding: '8px 16px' }}
            >
              {syncing ? <Spinner size={14} /> : <i className="fas fa-cloud-arrow-up" style={{ marginRight: 7 }} />}
              앱 → Notion 내보내기
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-sub)', padding: 0, fontFamily: 'inherit' }}
            >
              <i className="fas fa-pencil" style={{ marginRight: 5 }} />설정 변경
            </button>
            <button
              onClick={handleDisconnect}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--red-500)', padding: 0, fontFamily: 'inherit' }}
            >
              <i className="fas fa-unlink" style={{ marginRight: 5 }} />연결 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ③ Slack 카드
// ────────────────────────────────────────────────────────────
function SlackCard({ status, onRefresh }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [notifyCfg,  setNotifyCfg]  = useState({ daily: false, due_soon: false });

  const connected  = !!status?.connected;
  const lastSync   = status?.last_synced_at;

  useEffect(() => {
    if (status?.settings?.notify) {
      setNotifyCfg(status.settings.notify);
    }
  }, [status]);

  async function handleConnect(e) {
    e.preventDefault();
    setSaving(true); setResult('');
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), notify: notifyCfg }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult('✅ Slack 연결 완료! 테스트 메시지를 확인하세요.');
      setShowForm(false);
      onRefresh();
    } catch (e) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(type) {
    setSending(true); setResult('');
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(`✅ Slack으로 알림을 전송했습니다`);
    } catch (e) {
      setResult(`❌ ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Slack 연결을 해제하시겠습니까?')) return;
    await fetch('/api/integrations/slack', { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <SectionHeader
        icon="fa-brands fa-slack" label="Slack"
        color="#4A154B" connected={connected} lastSync={lastSync}
      />

      {result && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem',
          background: result.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.startsWith('✅') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: result.startsWith('✅') ? 'var(--green-500)' : 'var(--red-500)',
        }}>
          {result}
        </div>
      )}

      {!connected || showForm ? (
        <form onSubmit={handleConnect}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 10, lineHeight: 1.5 }}>
            Slack Incoming Webhook URL을 입력하면 할 일 알림을 받을 수 있습니다.
          </p>
          <GuideToggle>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li><a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--indigo-400,#818cf8)' }}>api.slack.com/apps</a> → <strong>Create New App</strong> → From scratch</li>
              <li>앱 이름 입력 후 워크스페이스 선택 → <strong>Create App</strong></li>
              <li>좌측 메뉴 <strong>Incoming Webhooks</strong> → 토글 <strong>On</strong></li>
              <li><strong>Add New Webhook to Workspace</strong> → 알림 받을 채널 선택</li>
              <li>생성된 URL 복사: <code>https://hooks.slack.com/services/T.../B.../...</code></li>
            </ol>
          </GuideToggle>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Incoming Webhook URL
            </label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              자동 알림
            </p>
            {[
              { key: 'daily',    label: '일일 요약', desc: '매일 오전 할 일 목록 전송 (서버에서 cron 필요)' },
              { key: 'due_soon', label: '마감 임박', desc: 'D-2 이내 태스크 알림' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyCfg[opt.key] ?? false}
                  onChange={e => setNotifyCfg(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)' }}>{opt.label}</span>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-sub)', margin: 0 }}>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: '0.83rem', padding: '8px 16px', background: '#4A154B' }}>
              {saving ? <Spinner /> : <i className="fas fa-plug" style={{ marginRight: 7 }} />}
              연결 및 테스트
            </button>
            {showForm && (
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{ fontSize: '0.83rem' }}>
                취소
              </button>
            )}
          </div>
        </form>
      ) : (
        <div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 12 }}>
            지금 바로 Slack으로 알림을 보낼 수 있습니다.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              className="btn-primary"
              onClick={() => handleSend('daily')}
              disabled={sending}
              style={{ fontSize: '0.83rem', padding: '8px 16px', background: '#4A154B' }}
            >
              {sending ? <Spinner /> : <i className="fas fa-paper-plane" style={{ marginRight: 7 }} />}
              오늘 요약 보내기
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSend('due_soon')}
              disabled={sending}
              style={{ fontSize: '0.83rem', padding: '8px 16px' }}
            >
              {sending ? <Spinner size={14} /> : <i className="fas fa-bell" style={{ marginRight: 7 }} />}
              마감 임박 알림
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-sub)', padding: 0, fontFamily: 'inherit' }}
            >
              <i className="fas fa-pencil" style={{ marginRight: 5 }} />설정 변경
            </button>
            <button
              onClick={handleDisconnect}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--red-500)', padding: 0, fontFamily: 'inherit' }}
            >
              <i className="fas fa-unlink" style={{ marginRight: 5 }} />연결 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const { user }       = useAuth();
  const [statuses, setStatuses] = useState({});
  const [loading,  setLoading]  = useState(true);
  const [banner,   setBanner]   = useState(null);

  const loadStatuses = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/integrations/status');
      const json = await res.json();
      setStatuses(json ?? {});
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const googleConfigured = statuses._meta?.googleConfigured ?? false;
  const connectedCount   = ['google_calendar', 'notion', 'slack']
    .filter(k => statuses[k]?.connected).length;

  return (
    <div className="page-wrapper" style={{ maxWidth: 660, margin: '0 auto' }}>
      {/* URL 파라미터 → 배너 (Suspense 필수) */}
      <Suspense fallback={null}>
        <BannerFromUrl onBanner={setBanner} />
      </Suspense>

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>
          <i className="fas fa-plug" style={{ marginRight: 10, color: 'var(--indigo-400,#818cf8)' }} />
          외부 서비스 연동
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', margin: 0 }}>
          Google Calendar, Notion, Slack을 연결해 하나의 생산성 허브로 사용하세요
        </p>
      </div>

      {/* 배너 */}
      {banner && (
        <Banner
          type={banner.type}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      {/* 연결 요약 */}
      {!loading && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 20,
          background: connectedCount > 0 ? 'rgba(99,102,241,0.07)' : 'var(--card)',
          border: '1px solid var(--border)',
        }}>
          <i className="fas fa-plug-circle-check"
            style={{ color: connectedCount > 0 ? 'var(--indigo-400)' : 'var(--text-muted)', marginTop: 2 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
            {connectedCount === 0
              ? '연결된 서비스가 없습니다. 아래에서 연동을 시작하세요.'
              : `${connectedCount}개 서비스 연결됨`}
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
          <div style={{
            width: 36, height: 36,
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: 'var(--indigo-600)',
            borderRadius: '50%', animation: 'spin-slow .7s linear infinite',
            margin: '0 auto 12px',
          }} />
          연동 상태 불러오는 중…
        </div>
      ) : (
        <>
          <GoogleCard status={statuses.google_calendar} googleConfigured={googleConfigured} onRefresh={loadStatuses} />
          <NotionCard  status={statuses.notion}          onRefresh={loadStatuses} />
          <SlackCard   status={statuses.slack}           onRefresh={loadStatuses} />
        </>
      )}

      {/* DB 설정 안내 */}
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginTop: 8,
        background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
      }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-sub)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <i className="fas fa-circle-info" style={{ marginRight: 6, color: 'var(--indigo-400)' }} />
          데이터베이스 설정 필요
        </p>
        <p style={{ fontSize: '0.77rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.55 }}>
          처음 사용 시 <code>supabase/migrations/003_integrations.sql</code>을 Supabase SQL Editor에서 실행하세요.
          Google Calendar 연동은 <code>.env.local</code>에 <code>GOOGLE_CLIENT_ID</code>와 <code>GOOGLE_CLIENT_SECRET</code>이 필요합니다.
        </p>
      </div>
    </div>
  );
}
