'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTasksByUser } from '@/models/taskModel';

const SUGGESTIONS = [
  '오늘 할일 어떻게 정리할까요?',
  '생산성을 높이는 팁 알려줘',
  '미루는 습관 고치는 방법',
  '우선순위 정하는 방법',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--text-sub)',
          animation: `aiDot .9s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const { user }  = useAuth();
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);   // { role, content, streaming? }
  const [input,   setInput]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [noKey,   setNoKey]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function buildContext() {
    if (!user) return '';
    try {
      const tasks = await getTasksByUser(user.id);
      const today = new Date().toISOString().split('T')[0];
      const todayTasks  = tasks.filter(t => !t.completed && t.date === today);
      const overdue     = tasks.filter(t => !t.completed && t.date < today);
      const upcoming    = tasks.filter(t => !t.completed && t.date > today).slice(0, 5);
      return [
        `오늘(${today}) 할일: ${todayTasks.map(t => `${t.title}(${t.priority})`).join(', ') || '없음'}`,
        overdue.length > 0 ? `미완료 지연: ${overdue.length}개` : '',
        upcoming.length > 0 ? `예정 할일: ${upcoming.map(t => t.title).join(', ')}` : '',
      ].filter(Boolean).join('\n');
    } catch { return ''; }
  }

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || busy) return;
    setInput('');
    setBusy(true);
    setNoKey(false);

    const newMsgs = [...msgs, { role: 'user', content: userMsg }];
    setMsgs(newMsgs);

    // AI 응답 자리 추가 (스트리밍용)
    setMsgs(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    const context = await buildContext();

    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });

      if (res.status === 503) { setNoKey(true); setMsgs(prev => prev.slice(0, -1)); setBusy(false); return; }
      if (!res.ok) throw new Error(`API 오류 (${res.status})`);

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let   buf    = '';
      let   answer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            if (json.text) {
              answer += json.text;
              setMsgs(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: answer } : m
              ));
            }
          } catch { /* skip */ }
        }
      }

      // 스트리밍 완료
      setMsgs(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, streaming: false } : m
      ));
    } catch (e) {
      setMsgs(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { role: 'assistant', content: `오류: ${e.message}`, streaming: false } : m
      ));
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <>
      {/* 패널 */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 76, right: 78, zIndex: 1000,
          width: 340, height: 480,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'fadeSlideUp .18s ease',
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-wand-magic-sparkles" style={{ color: '#fff', fontSize: '0.85rem' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>AI 비서</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>claude haiku · 생산성 도우미</div>
            </div>
            {msgs.length > 0 && (
              <button onClick={() => setMsgs([])} style={{
                marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.73rem', color: 'var(--text-sub)', fontFamily: 'inherit', padding: '3px 8px',
              }}>
                초기화
              </button>
            )}
          </div>

          {/* 메시지 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* API 키 없음 */}
            {noKey && (
              <div style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                fontSize: '0.78rem', color: '#f59e0b',
              }}>
                <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />
                <code>.env.local</code>에 <code>ANTHROPIC_API_KEY</code>를 설정해야 AI 비서를 사용할 수 있습니다.
              </div>
            )}

            {/* 빈 상태 */}
            {msgs.length === 0 && !noKey && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 12 }}>
                <div style={{ fontSize: '2rem' }}>✨</div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-sub)', textAlign: 'center', lineHeight: 1.5 }}>
                  일정과 할일에 대해 무엇이든 물어보세요!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{
                      padding: '8px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                      border: '1px solid var(--border)', background: 'var(--border-lt)',
                      color: 'var(--text-sub)', fontSize: '0.78rem', fontFamily: 'inherit',
                      transition: 'all .12s',
                    }}
                      onMouseEnter={e => e.target.style.borderColor = 'var(--indigo-400,#818cf8)'}
                      onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 메시지들 */}
            {msgs.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'assistant' && msg.streaming && !msg.content && (
                  <TypingDots />
                )}
                {(msg.content || msg.role === 'user') && (
                  <div style={{
                    maxWidth: '85%', padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: msg.role === 'user'
                      ? 'var(--indigo-600,#4f46e5)'
                      : 'var(--border-lt)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    fontSize: '0.84rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                    {msg.streaming && msg.content && (
                      <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'currentColor', marginLeft: 2, animation: 'aiDot .8s infinite' }} />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            style={{
              padding: '10px 12px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 7, flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="무엇이든 물어보세요…"
              disabled={busy}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--border-lt)',
                color: 'var(--text)', fontSize: '0.83rem', fontFamily: 'inherit',
                outline: 'none', opacity: busy ? 0.7 : 1,
              }}
            />
            <button type="submit" disabled={!input.trim() || busy} style={{
              width: 34, height: 34, borderRadius: 9, border: 'none', flexShrink: 0,
              background: input.trim() && !busy ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border)',
              color: input.trim() && !busy ? '#fff' : 'var(--text-sub)',
              cursor: input.trim() && !busy ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
            }}>
              {busy
                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow .7s linear infinite' }} />
                : <i className="fas fa-paper-plane" style={{ fontSize: '0.73rem' }} />
              }
            </button>
          </form>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(p => !p)}
        title="AI 비서"
        className={`widget-fab${open ? ' active' : ''}`}
        style={{
          position: 'fixed', bottom: 20, right: 78, zIndex: 1001,
          width: 50, height: 50, borderRadius: '50%',
          boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.05rem',
        }}
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-wand-magic-sparkles'}`} />
      </button>
    </>
  );
}
