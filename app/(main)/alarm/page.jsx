'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ── 공통 스타일 ─────────────────────────────────────────────── */
const card   = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' };
const btnBase = { fontFamily: 'inherit', cursor: 'pointer', borderRadius: 9, border: 'none', fontWeight: 600, fontSize: '0.85rem', transition: 'opacity .12s' };
const btnPrimary   = { ...btnBase, background: 'var(--indigo-600,#4f46e5)', color: '#fff', padding: '8px 18px' };
const btnSecondary = { ...btnBase, background: 'var(--border-lt,#f1f5f9)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 16px' };

function beep(times = 1) {
  try {
    const ctx = new (window.AudioContext || window['webkitAudioContext'])();
    for (let i = 0; i < times; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t); osc.stop(t + 0.28);
    }
  } catch {}
}

function notify(title, body) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

/* ── 알람 탭 ─────────────────────────────────────────────────── */
function AlarmTab() {
  const [alarms, setAlarms]   = useState([]);
  const [time,   setTime]     = useState('07:00');
  const [label,  setLabel]    = useState('');
  const [perm,   setPerm]     = useState('default');
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPerm(Notification.permission);
    try { setAlarms(JSON.parse(localStorage.getItem('tc-alarms') || '[]')); } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('tc-alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    const id = setInterval(() => {
      const now  = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const key  = `${now.toDateString()}-${hhmm}`;
      alarms.forEach(a => {
        if (a.enabled && a.time === hhmm && !firedRef.current.has(`${a.id}-${key}`)) {
          firedRef.current.add(`${a.id}-${key}`);
          beep(3);
          notify(`⏰ ${a.label || '알람'}`, `${a.time} 알람이 울렸습니다.`);
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [alarms]);

  const [permLoading, setPermLoading] = useState(false);

  const requestPerm = async () => {
    if (permLoading) return;
    setPermLoading(true);
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
    } finally {
      setPermLoading(false);
    }
  };
  const add    = () => { if (!time) return; setAlarms(p => [...p, { id: Date.now(), time, label, enabled: true }]); setLabel(''); };
  const toggle = id => setAlarms(p => p.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const remove = id => setAlarms(p => p.filter(a => a.id !== id));

  return (
    <div>
      {perm === 'denied' && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', fontSize: '0.8rem', color: '#dc2626' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            <i className="fas fa-ban" style={{ marginRight: 6 }} />알림 권한이 차단되었습니다
          </div>
          브라우저 주소창 왼쪽 자물쇠(🔒) 아이콘 → 알림 → <strong>허용</strong>으로 변경 후 새로고침하세요.
        </div>
      )}
      {perm === 'default' && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.22)' }}>
          <div style={{ fontSize: '0.82rem', color: '#b45309', marginBottom: 8 }}>
            <i className="fas fa-bell-slash" style={{ marginRight: 6 }} />
            알람이 울릴 때 브라우저 알림을 받으려면 권한이 필요합니다.
          </div>
          <button
            onClick={requestPerm}
            disabled={permLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', cursor: permLoading ? 'wait' : 'pointer', opacity: permLoading ? .7 : 1 }}
          >
            <i className={`fas ${permLoading ? 'fa-spinner fa-spin' : 'fa-bell'}`} />
            {permLoading ? '권한 요청 중…' : '알림 허용하기'}
          </button>
        </div>
      )}

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 10, color: 'var(--text)' }}>새 알람</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '1.05rem', fontWeight: 700 }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="알람 이름 (선택)"
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ flex: 1, minWidth: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.88rem' }} />
          <button onClick={add} style={btnPrimary}><i className="fas fa-plus" style={{ marginRight: 5 }} />추가</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alarms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
            <i className="fas fa-bell-slash" style={{ fontSize: '2rem', opacity: .35, display: 'block', marginBottom: 8 }} />
            설정된 알람이 없습니다
          </div>
        )}
        {alarms.map(a => (
          <div key={a.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, opacity: a.enabled ? 1 : .45 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{a.time}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{a.label || '알람'}</div>
            </div>
            <div onClick={() => toggle(a.id)} style={{ width: 46, height: 26, borderRadius: 26, background: a.enabled ? 'var(--indigo-600,#4f46e5)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#fff', top: 3, left: a.enabled ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
            </div>
            <button onClick={() => remove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: 4, fontSize: '0.85rem' }}>
              <i className="fas fa-trash-can" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 스톱워치 탭 ──────────────────────────────────────────────── */
function StopwatchTab() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps,    setLaps]    = useState([]);
  const startRef = useRef(0);
  const rafRef   = useRef(null);

  const tick = useCallback(() => {
    setElapsed(Date.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => { startRef.current = Date.now() - elapsed; rafRef.current = requestAnimationFrame(tick); setRunning(true); };
  const pause = () => { cancelAnimationFrame(rafRef.current); setRunning(false); };
  const reset = () => { cancelAnimationFrame(rafRef.current); setRunning(false); setElapsed(0); setLaps([]); };
  const lap   = () => setLaps(p => [...p, elapsed]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const fmt = ms => {
    const m  = Math.floor(ms / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 8 }}>
      <div style={{ fontSize: '3.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: 1, color: 'var(--text)' }}>
        {fmt(elapsed)}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {!running
          ? <button onClick={start} style={btnPrimary}><i className="fas fa-play" style={{ marginRight: 6 }} />{elapsed === 0 ? '시작' : '재개'}</button>
          : <button onClick={pause} style={btnSecondary}><i className="fas fa-pause" style={{ marginRight: 6 }} />정지</button>}
        <button onClick={lap} style={{ ...btnSecondary, opacity: running ? 1 : .45 }} disabled={!running}>
          <i className="fas fa-flag" style={{ marginRight: 5 }} />랩
        </button>
        <button onClick={reset} style={btnSecondary}><i className="fas fa-rotate-left" style={{ marginRight: 5 }} />초기화</button>
      </div>

      {laps.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 8 }}>랩 기록</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...laps].reverse().map((t, ri) => {
              const i = laps.length - 1 - ri;
              const diff = i > 0 ? t - laps[i - 1] : t;
              return (
                <div key={i} style={{ ...card, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: '0.82rem' }}>랩 {i + 1}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(diff)}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem', color: 'var(--text-sub)' }}>{fmt(t)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 타이머 탭 ───────────────────────────────────────────────── */
const PRESETS = [
  { label: '1분', s: 60 }, { label: '5분', s: 300 }, { label: '10분', s: 600 },
  { label: '25분', s: 1500 }, { label: '30분', s: 1800 }, { label: '1시간', s: 3600 },
];

function TimerTab() {
  const [total,   setTotal]   = useState(1500);
  const [remain,  setRemain]  = useState(1500);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(25);
  const [ss, setSs] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemain(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remain === 0 && running) {
      setRunning(false); setDone(true);
      beep(3);
      notify('⏰ 타이머 완료!', '설정한 시간이 종료되었습니다.');
    }
  }, [remain, running]);

  const applyInput = () => {
    const sec = hh * 3600 + mm * 60 + ss;
    if (sec <= 0) return;
    setTotal(sec); setRemain(sec); setDone(false); setRunning(false);
  };
  const setPreset = sec => {
    setTotal(sec); setRemain(sec); setDone(false); setRunning(false);
    setHh(Math.floor(sec / 3600)); setMm(Math.floor((sec % 3600) / 60)); setSs(sec % 60);
  };
  const reset = () => { setRunning(false); setRemain(total); setDone(false); };

  const pct = total > 0 ? (1 - remain / total) * 100 : 0;
  const R   = 80;
  const C   = 2 * Math.PI * R;
  const fmtR = sec => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const numInput = (val, max) => Math.min(max, Math.max(0, parseInt(val) || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 8 }}>
      {/* 원형 프로그레스 */}
      <div style={{ position: 'relative', width: 192, height: 192 }}>
        <svg width="192" height="192" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="96" cy="96" r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
          <circle cx="96" cy="96" r={R} fill="none"
            stroke={done ? '#22c55e' : 'var(--indigo-600,#4f46e5)'}
            strokeWidth={10} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset .5s, stroke .3s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2.1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{fmtR(remain)}</span>
          {done && <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700 }}>완료!</span>}
        </div>
      </div>

      {/* 프리셋 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {PRESETS.map(p => (
          <button key={p.s} onClick={() => setPreset(p.s)} style={{
            ...btnSecondary, padding: '6px 12px',
            background: total === p.s && remain === p.s ? 'var(--indigo-600,#4f46e5)' : undefined,
            color:      total === p.s && remain === p.s ? '#fff' : undefined,
            border:     total === p.s && remain === p.s ? '1px solid transparent' : undefined,
          }}>{p.label}</button>
        ))}
      </div>

      {/* 직접 입력 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[['시', hh, setHh, 99], ['분', mm, setMm, 59], ['초', ss, setSs, 59]].map(([lbl, val, set, max]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="number" value={val} min={0} max={max}
              onChange={e => set(numInput(e.target.value, max))}
              style={{ width: 52, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center', fontSize: '0.9rem' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>{lbl}</span>
          </div>
        ))}
        <button onClick={applyInput} style={{ ...btnSecondary, padding: '6px 12px' }}>설정</button>
      </div>

      {/* 제어 버튼 */}
      <div style={{ display: 'flex', gap: 10 }}>
        {!running
          ? <button onClick={() => { setDone(false); setRunning(true); }} style={{ ...btnPrimary, opacity: remain === 0 ? .45 : 1 }} disabled={remain === 0}>
              <i className="fas fa-play" style={{ marginRight: 6 }} />{remain === total ? '시작' : '재개'}
            </button>
          : <button onClick={() => setRunning(false)} style={btnSecondary}>
              <i className="fas fa-pause" style={{ marginRight: 6 }} />정지
            </button>}
        <button onClick={reset} style={btnSecondary}><i className="fas fa-rotate-left" style={{ marginRight: 5 }} />초기화</button>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
const TABS = [
  { id: 'alarm',     label: '알람 설정',  icon: 'fa-bell' },
  { id: 'stopwatch', label: '스톱워치',   icon: 'fa-stopwatch' },
  { id: 'timer',     label: '타이머',     icon: 'fa-hourglass-half' },
];

export default function AlarmPage() {
  const [tab, setTab] = useState('alarm');
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <i className="fas fa-bell" style={{ fontSize: '1.25rem', color: 'var(--indigo-600,#4f46e5)' }} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>알람</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--border-lt,#f1f5f9)', borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600, transition: 'all .15s',
            background: tab === t.id ? 'var(--card)' : 'transparent',
            color:      tab === t.id ? 'var(--text)' : 'var(--text-sub)',
            boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}>
            <i className={`fas ${t.icon}`} style={{ marginRight: 5 }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'alarm'     && <AlarmTab />}
      {tab === 'stopwatch' && <StopwatchTab />}
      {tab === 'timer'     && <TimerTab />}
    </div>
  );
}
