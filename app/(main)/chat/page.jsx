'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserTeams, getTeamMembers } from '@/models/teamModel';
import { teamRoomId, dmRoomId, getMessages, sendMessage, subscribeToRoom, getLastMessage } from '@/models/chatModel';

const MEMBER_COLORS = ['#6366f1','#ef4444','#22c55e','#f97316','#06b6d4','#a855f7','#ec4899','#f59e0b'];

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)  return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function Avatar({ name, colorIdx, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: MEMBER_COLORS[colorIdx % MEMBER_COLORS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38 + 'rem',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

// ─── 룸 목록 아이템 ───────────────────────────────────────
function RoomItem({ room, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 14px', border: 'none', cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
        borderRadius: 10, textAlign: 'left', fontFamily: 'inherit',
        transition: 'background .12s',
      }}
    >
      <Avatar name={room.label} colorIdx={room.colorIdx} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontSize: '0.87rem', fontWeight: active ? 700 : 600,
            color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {room.label}
          </span>
          {room.lastMsg && (
            <span style={{ fontSize: '0.67rem', color: 'var(--text-muted,#9ca3af)', flexShrink: 0, marginLeft: 4 }}>
              {fmtTime(room.lastMsg.created_at)}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-sub)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1,
        }}>
          {room.lastMsg
            ? `${room.lastMsg.sender_name}: ${room.lastMsg.content}`
            : room.type === 'team' ? `팀 그룹채팅` : '대화를 시작하세요'}
        </div>
      </div>
    </button>
  );
}

// ─── 메시지 버블 ──────────────────────────────────────────
function MessageBubble({ msg, isMine, prevSenderId }) {
  const showHeader = prevSenderId !== msg.sender_id;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 2,
      marginTop: showHeader ? 10 : 0,
    }}>
      {showHeader && !isMine && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 3, paddingLeft: 44 }}>
          {msg.sender_name}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
        {!isMine && showHeader && (
          <Avatar name={msg.sender_name} colorIdx={msg.sender_name.charCodeAt(0) % MEMBER_COLORS.length} size={30} />
        )}
        {!isMine && !showHeader && <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{
          maxWidth: '72%', padding: '8px 12px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isMine ? 'var(--indigo-600,#4f46e5)' : 'var(--card)',
          color: isMine ? '#fff' : 'var(--text)',
          border: isMine ? 'none' : '1px solid var(--border)',
          fontSize: '0.87rem', lineHeight: 1.45, wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted,#9ca3af)', flexShrink: 0, paddingBottom: 2 }}>
          {fmtTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── 채팅 창 ──────────────────────────────────────────────
function ChatPane({ room, user, displayName }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // 메시지 로드
  useEffect(() => {
    if (!room) return;
    setLoading(true);
    setMessages([]);
    getMessages(room.id).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [room?.id]);

  // Realtime 구독
  useEffect(() => {
    if (!room) return;
    const unsub = subscribeToRoom(room.id, (newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }, 'pane');
    return unsub;
  }, [room?.id]);

  // 새 메시지 오면 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 창 열리면 입력창 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, [room?.id]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    try {
      await sendMessage(room.id, user.id, displayName, text);
    } catch { /* 오류 시 입력 복원 */
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  if (!room) return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', color: 'var(--text-sub)', gap: 12,
    }}>
      <i className="fas fa-comments" style={{ fontSize: '2.8rem', opacity: 0.25 }} />
      <p style={{ fontSize: '0.9rem' }}>채팅방을 선택하세요</p>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      {/* 채팅방 헤더 */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <Avatar name={room.label} colorIdx={room.colorIdx} size={34} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{room.label}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-sub)' }}>
            {room.type === 'team' ? `팀 그룹채팅` : '개인 메시지'}
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '40px 0', fontSize: '0.85rem' }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />불러오는 중…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '40px 0' }}>
            <i className="fas fa-comment-dots" style={{ fontSize: '1.8rem', opacity: 0.25, display: 'block', marginBottom: 10 }} />
            <p style={{ fontSize: '0.85rem' }}>첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender_id === user.id}
              prevSenderId={i > 0 ? messages[i - 1].sender_id : null}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력… (Enter 전송, Shift+Enter 줄바꿈)"
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '9px 13px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--text)',
            fontSize: '0.87rem', fontFamily: 'inherit', lineHeight: 1.4,
            maxHeight: 120, outline: 'none',
            overflowY: input.split('\n').length > 4 ? 'auto' : 'hidden',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: input.trim() ? 'var(--indigo-600,#4f46e5)' : 'var(--border)',
            color: input.trim() ? '#fff' : 'var(--text-sub)',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .12s', flexShrink: 0,
          }}
        >
          {sending
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow .7s linear infinite' }} />
            : <i className="fas fa-paper-plane" style={{ fontSize: '0.82rem' }} />
          }
        </button>
      </form>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [tab,         setTab]         = useState('all'); // 'all' | 'team' | 'dm'

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const teams = await getUserTeams(user.id);

      // 팀 채팅방
      const teamRooms = teams.map((t, i) => ({
        id:       teamRoomId(t.id),
        type:     'team',
        label:    t.name,
        teamId:   t.id,
        colorIdx: i,
        lastMsg:  null,
      }));

      // DM: 모든 팀 멤버에서 나 제외
      const memberSets = await Promise.all(teams.map(t => getTeamMembers(t.id)));
      const allMembers = memberSets.flat();
      const uniqueMembers = [];
      const seen = new Set([user.id]);
      for (const m of allMembers) {
        if (!seen.has(m.user_id)) { seen.add(m.user_id); uniqueMembers.push(m); }
      }

      const dmRooms = uniqueMembers.map((m, i) => ({
        id:       dmRoomId(user.id, m.user_id),
        type:     'dm',
        label:    m.display_name || m.email?.split('@')[0] || '멤버',
        peerId:   m.user_id,
        colorIdx: (teams.length + i) % MEMBER_COLORS.length,
        lastMsg:  null,
      }));

      const all = [...teamRooms, ...dmRooms];

      // 마지막 메시지 병렬 조회
      const lastMsgs = await Promise.allSettled(all.map(r => getLastMessage(r.id)));
      lastMsgs.forEach((res, i) => {
        if (res.status === 'fulfilled') all[i].lastMsg = res.value;
      });

      // 최근 대화 순 정렬
      all.sort((a, b) => {
        const ta = a.lastMsg?.created_at ?? '';
        const tb = b.lastMsg?.created_at ?? '';
        return tb.localeCompare(ta);
      });

      setRooms(all);
      if (!activeRoom && all.length > 0) setActiveRoom(all[0]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // 새 메시지 수신 시 룸 목록 lastMsg 업데이트
  useEffect(() => {
    if (!activeRoom) return;
    const unsub = subscribeToRoom(activeRoom.id, (msg) => {
      setRooms(prev => prev.map(r =>
        r.id === activeRoom.id ? { ...r, lastMsg: msg } : r
      ));
    }, 'list');
    return unsub;
  }, [activeRoom?.id]);

  const filtered = rooms.filter(r => {
    if (tab === 'team' && r.type !== 'team') return false;
    if (tab === 'dm'   && r.type !== 'dm')   return false;
    if (search && !r.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', minHeight: 0 }}>

      {/* ── 왼쪽: 룸 목록 ── */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)', background: 'var(--surface,var(--card))',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 14px 10px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 12px' }}>
            <i className="fas fa-comments" style={{ marginRight: 8, color: 'var(--indigo-400,#818cf8)' }} />
            채팅
          </h2>

          {/* 검색 */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <i className="fas fa-magnifying-glass" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.75rem', color: 'var(--text-sub)',
            }} />
            <input
              type="text"
              placeholder="채팅 검색…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px 7px 30px', borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>

          {/* 탭 필터 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['all','전체'],['team','팀'],['dm','DM']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: '4px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: tab === key ? 'var(--indigo-600,#4f46e5)' : 'transparent',
                color: tab === key ? '#fff' : 'var(--text-sub)',
                fontSize: '0.77rem', fontWeight: tab === key ? 700 : 400, fontFamily: 'inherit',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* 룸 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-sub)', fontSize: '0.83rem' }}>
              <i className="fas fa-spinner fa-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-sub)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              {rooms.length === 0
                ? '팀에 가입하면 채팅방이 생깁니다\n팀 페이지에서 팀을 만들거나 참여하세요'
                : '검색 결과가 없습니다'}
            </div>
          ) : (
            <>
              {/* 팀 그룹채팅 */}
              {(tab === 'all' || tab === 'team') && filtered.some(r => r.type === 'team') && (
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted,#9ca3af)', padding: '8px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  팀 채팅
                </p>
              )}
              {filtered.filter(r => r.type === 'team' || tab === 'dm').map(r =>
                r.type === 'team' ? (
                  <RoomItem key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => setActiveRoom(r)} />
                ) : null
              )}
              {/* DM */}
              {(tab === 'all' || tab === 'dm') && filtered.some(r => r.type === 'dm') && (
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted,#9ca3af)', padding: '8px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  개인 메시지
                </p>
              )}
              {filtered.filter(r => r.type === 'dm' || tab === 'team').map(r =>
                r.type === 'dm' ? (
                  <RoomItem key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => setActiveRoom(r)} />
                ) : null
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 오른쪽: 채팅 창 ── */}
      <ChatPane room={activeRoom} user={user} displayName={displayName} />
    </div>
  );
}
