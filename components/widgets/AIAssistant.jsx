'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getActiveTasks } from '@/models/taskModel';
import { getTeamTasksByDateRange } from '@/models/teamTaskModel';

const SUGGESTIONS = [
  '오늘 일정 요약해줘',
  '이번 주 마감 다가오는 것 알려줘',
  '미완료 할일 중 긴급한 것은?',
  '이번 주 팀 일정 있어?',
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
  const [busy,      setBusy]      = useState(false);
  const [connError, setConnError] = useState(false);
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

    const now = new Date();
    const DOW = ['일','월','화','수','목','금','토'];
    const p   = n => String(n).padStart(2, '0');

    // ★ 로컬 날짜 문자열 — toISOString() 사용 금지 (UTC 변환으로 1일 밀림)
    const lds = d => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
    const addD = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

    const today  = lds(now);
    const past7  = lds(addD(now, -7));

    // 이번 주·다음 주 — setDate 기반 로컬 계산
    const dow     = now.getDay();
    const thisMon = addD(now, dow === 0 ? -6 : 1 - dow);
    const thisSun = addD(thisMon, 6);
    const nextMon = addD(thisMon, 7);
    const nextSun = addD(thisSun, 7);

    const base = [
      `오늘: ${today} (${DOW[dow]}요일)`,
      `이번 주(월~일): ${lds(thisMon)} ~ ${lds(thisSun)}`,
      `다음 주(월~일): ${lds(nextMon)} ~ ${lds(nextSun)}`,
    ].join('\n');

    // 날짜 문자열이 YYYY-MM-DD로 시작하면 유효 (timestamp 형식도 허용)
    const isValidDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
    // 날짜 부분만 추출 (timestamp "2026-06-06T..." → "2026-06-06")
    const dateOf = s => s.slice(0, 10);

    const fmt = t => {
      if (!isValidDate(t.date)) return null;
      const ds = dateOf(t.date);
      const d  = new Date(ds + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      const dl = isValidDate(t.deadline) ? dateOf(t.deadline) : null;
      return `  • ${ds}(${DOW[d.getDay()]}요일) "${t.title}"` +
        (t.due_time ? ` ${t.due_time}` : '') +
        (t.priority === 'high' ? ' [긴급]' : '') +
        (dl && dl !== ds ? ` (마감:${dl})` : '');
    };

    const in30       = lds(addD(now, 30));
    const thisMonStr = lds(thisMon);
    const thisSunStr = lds(thisSun);
    const nextMonStr = lds(nextMon);
    const nextSunStr = lds(nextSun);

    // ① 개인 일정 — 이번 주/다음 주 명시 구분 (AI가 날짜 계산 없이 섹션명만 보면 됨)
    let personalCtx = '[개인 일정]\n등록된 일정 없음 — 대시보드에서 AI로 일정을 추가해보세요.';
    try {
      const raw = await getActiveTasks(user.id);
      if (process.env.NODE_ENV === 'development') {
        console.log('[AI컨텍스트] 개인 태스크 수:', raw.length, '첫 번째 date 샘플:', raw[0]?.date);
      }
      const myTasks = raw.filter(t => isValidDate(t.date));

      const beforeWeek = myTasks.filter(t => dateOf(t.date) < thisMonStr);
      const thisWeek   = myTasks.filter(t => dateOf(t.date) >= thisMonStr && dateOf(t.date) <= thisSunStr);
      const nextWeekT  = myTasks.filter(t => dateOf(t.date) >= nextMonStr && dateOf(t.date) <= nextSunStr);
      const later      = myTasks.filter(t => dateOf(t.date) > nextSunStr && dateOf(t.date) <= in30);

      if (beforeWeek.length || thisWeek.length || nextWeekT.length || later.length) {
        personalCtx = [
          '[개인 일정]',
          beforeWeek.length ? `■ 지연 미완료(이번 주 이전, ${beforeWeek.length}개):\n${beforeWeek.map(fmt).filter(Boolean).join('\n')}` : null,
          `■ 이번 주(${thisMonStr} ~ ${thisSunStr}):\n${thisWeek.length ? thisWeek.map(fmt).filter(Boolean).join('\n') : '  없음'}`,
          `■ 다음 주(${nextMonStr} ~ ${nextSunStr}):\n${nextWeekT.length ? nextWeekT.map(fmt).filter(Boolean).join('\n') : '  없음'}`,
          later.length ? `■ 이후(${lds(addD(nextSun, 1))} ~ ${in30}):\n${later.map(fmt).filter(Boolean).join('\n')}` : null,
        ].filter(Boolean).join('\n');
      }
    } catch (e) {
      console.error('[AI비서] 개인 일정 조회 실패:', e.message);
      personalCtx = '[개인 일정]\n(일시적으로 조회할 수 없습니다 — 잠시 후 다시 시도하세요)';
    }

    // ② 팀 일정 — 이번 주/다음 주 명시 구분, 팀 없어도 섹션 항상 포함
    let teamCtx = '[팀 일정]\n등록된 팀 일정이 없습니다.';
    try {
      const teamTasks = await getTeamTasksByDateRange(past7, in30);
      const active = teamTasks.filter(t => !t.completed && isValidDate(t.date));

      const teamFmt = t => {
        const ds = dateOf(t.date);
        const d  = new Date(ds + 'T00:00:00');
        if (isNaN(d.getTime())) return null;
        return `  • ${ds}(${DOW[d.getDay()]}요일) "${t.title}" [${t._teamName || '팀'}]` +
          (t.assigned_to === user.id ? ' [내 담당]' : '') +
          (t.priority === 'high' ? ' [긴급]' : '');
      };

      const tBefore   = active.filter(t => dateOf(t.date) < thisMonStr);
      const tThisWeek = active.filter(t => dateOf(t.date) >= thisMonStr && dateOf(t.date) <= thisSunStr);
      const tNextWeek = active.filter(t => dateOf(t.date) >= nextMonStr && dateOf(t.date) <= nextSunStr);
      const tLater    = active.filter(t => dateOf(t.date) > nextSunStr && dateOf(t.date) <= in30);

      if (active.length) {
        teamCtx = [
          '[팀 일정]',
          tBefore.length  ? `■ 지연(이번 주 이전, ${tBefore.length}개):\n${tBefore.map(teamFmt).filter(Boolean).join('\n')}` : null,
          `■ 이번 주(${thisMonStr} ~ ${thisSunStr}):\n${tThisWeek.length ? tThisWeek.map(teamFmt).filter(Boolean).join('\n') : '  없음'}`,
          `■ 다음 주(${nextMonStr} ~ ${nextSunStr}):\n${tNextWeek.length ? tNextWeek.map(teamFmt).filter(Boolean).join('\n') : '  없음'}`,
          tLater.length ? `■ 이후(${lds(addD(nextSun, 1))} ~ ${in30}):\n${tLater.map(teamFmt).filter(Boolean).join('\n')}` : null,
        ].filter(Boolean).join('\n');
      }
    } catch { /* 팀 없거나 오류 */ }

    return [base, personalCtx, teamCtx].filter(Boolean).join('\n\n');
  }

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || busy) return;
    setInput('');
    setBusy(true);
    setConnError(false);

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

      if (res.status === 503) { setConnError(true); setMsgs(prev => prev.slice(0, -1)); setBusy(false); return; }
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
        <div className="fab-ai-panel" style={{
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
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>AI 일정 비서</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>Groq · 일정 전문 비서</div>
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
            {connError && (
              <div style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                fontSize: '0.78rem', color: '#f59e0b',
              }}>
                <i className="fas fa-triangle-exclamation" style={{ marginRight: 6 }} />
                <code>.env.local</code>에 <code>GROQ_API_KEY</code>를 설정해야 AI 일정 비서를 사용할 수 있습니다.
              </div>
            )}

            {/* 빈 상태 */}
            {msgs.length === 0 && !connError && (
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
        title="AI 일정 비서"
        className={`widget-fab fab-ai-btn${open ? ' active' : ''}`}
        style={{
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
