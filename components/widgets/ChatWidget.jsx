'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserTeams, getTeamMembers } from '@/models/teamModel';
import { teamRoomId, dmRoomId, getMessages, sendMessage, subscribeToRoom } from '@/models/chatModel';

const COLORS = ['#6366f1','#ef4444','#22c55e','#f97316','#06b6d4','#a855f7','#ec4899','#f59e0b'];

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), diff = now - d;
  if (diff < 60000)   return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (d.toDateString() === now.toDateString())
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function Av({ name, colorIdx, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: COLORS[(colorIdx ?? 0) % COLORS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.42 + 'px',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function RoomBtn({ room, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      width: '100%', padding: '7px 10px', border: 'none',
      borderLeft: `2px solid ${active ? '#4f46e5' : 'transparent'}`,
      background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s',
    }}>
      <Av name={room.label} colorIdx={room.colorIdx} size={26} />
      <span style={{
        fontSize: '0.75rem', fontWeight: active ? 700 : 500,
        color: active ? 'var(--text)' : 'var(--text-sub)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {room.label}
      </span>
    </button>
  );
}

/* ── 섹션 레이블 + 액션 버튼 ── */
function SectionLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px 3px', gap: 4 }}>
      <span style={{ flex: 1, fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {children}
      </span>
      {action}
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();

  const [open,          setOpen]          = useState(false);
  const [rooms,         setRooms]         = useState([]);      // 채팅방 목록
  const [allMembers,    setAllMembers]     = useState([]);      // DM 가능한 전체 팀원
  const [activeRoom,    setActiveRoom]     = useState(null);
  const [messages,      setMessages]       = useState([]);
  const [input,         setInput]          = useState('');
  const [sending,       setSending]        = useState(false);
  const [loadingRooms,  setLoadingRooms]   = useState(false);
  const [loadingMsgs,   setLoadingMsgs]    = useState(false);
  const [dmPickerOpen,  setDmPickerOpen]   = useState(false);  // DM 멤버 선택 패널
  const [dmSearch,      setDmSearch]       = useState('');

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const dmSearchRef = useRef(null);

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';

  /* ── 룸 + 멤버 로드 ── */
  const loadRooms = useCallback(async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const teams = await getUserTeams(user.id);
      const teamRooms = teams.map((t, i) => ({
        id: teamRoomId(t.id), type: 'team', label: t.name, colorIdx: i,
      }));

      const memberSets = await Promise.all(teams.map(t => getTeamMembers(t.id)));
      const seen = new Set([user.id]);
      const members = [];  // DM 대상 전체 (중복 제거)
      const dmRooms = [];

      memberSets.flat().forEach(m => {
        if (seen.has(m.user_id)) return;
        seen.add(m.user_id);
        const colorIdx = (teams.length + members.length) % COLORS.length;
        members.push({
          user_id:  m.user_id,
          label:    m.display_name || m.email?.split('@')[0] || '멤버',
          email:    m.email,
          colorIdx,
        });
        dmRooms.push({
          id: dmRoomId(user.id, m.user_id), type: 'dm',
          label: m.display_name || m.email?.split('@')[0] || '멤버',
          colorIdx,
          peerId: m.user_id,
        });
      });

      setAllMembers(members);
      const all = [...teamRooms, ...dmRooms];
      setRooms(all);
      if (!activeRoom && all.length > 0) setActiveRoom(all[0]);
    } catch { /* ignore */ }
    finally { setLoadingRooms(false); }
  }, [user]); // eslint-disable-line

  useEffect(() => { if (open) loadRooms(); }, [open, loadRooms]);

  /* ── 메시지 로드 ── */
  useEffect(() => {
    if (!activeRoom) return;
    setLoadingMsgs(true);
    setMessages([]);
    getMessages(activeRoom.id, 40).then(msgs => {
      setMessages(msgs);
      setLoadingMsgs(false);
    });
  }, [activeRoom?.id]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!activeRoom) return;
    return subscribeToRoom(activeRoom.id, msg => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    }, 'widget');
  }, [activeRoom?.id]);

  /* ── 스크롤 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeRoom && !dmPickerOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeRoom?.id, dmPickerOpen]);

  useEffect(() => {
    if (dmPickerOpen) setTimeout(() => dmSearchRef.current?.focus(), 80);
  }, [dmPickerOpen]);

  /* ── 전송 ── */
  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !activeRoom) return;
    setInput('');
    setSending(true);
    try { await sendMessage(activeRoom.id, user.id, displayName, text); }
    catch { setInput(text); }
    finally { setSending(false); }
  }

  /* ── DM 시작 ── */
  function startDM(member) {
    const rid = dmRoomId(user.id, member.user_id);
    // 기존 DM 방이 있으면 선택, 없으면 목록에 추가
    const existing = rooms.find(r => r.id === rid);
    if (existing) {
      setActiveRoom(existing);
    } else {
      const newRoom = { id: rid, type: 'dm', label: member.label, colorIdx: member.colorIdx, peerId: member.user_id };
      setRooms(prev => [...prev, newRoom]);
      setActiveRoom(newRoom);
    }
    setDmPickerOpen(false);
    setDmSearch('');
  }

  if (!user) return null;

  const dmRooms    = rooms.filter(r => r.type === 'dm');
  const teamRooms  = rooms.filter(r => r.type === 'team');

  /* DM 피커: 아직 DM을 시작하지 않은 멤버 우선, 이미 시작한 멤버도 표시 */
  const pickerMembers = allMembers.filter(m =>
    !dmSearch || m.label.toLowerCase().includes(dmSearch.toLowerCase()) || m.email?.toLowerCase().includes(dmSearch.toLowerCase())
  );

  return (
    <>
      {/* ── 패널 ── */}
      {open && (
        <div className="fab-chat-panel" style={{
          width: 360, height: 500,
          borderRadius: 16, border: '1px solid var(--border)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
          background: 'var(--card)',
          display: 'flex', flexDirection: 'row',
          overflow: 'hidden',
          animation: 'fadeSlideUp .18s ease',
        }}>

          {/* ── 왼쪽: 룸 목록 ── */}
          <div style={{
            width: 130, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative',
          }}>

            {/* 상단 레이블 */}
            <div style={{
              padding: '12px 10px 8px', fontSize: '0.68rem', fontWeight: 700,
              color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em',
              flexShrink: 0,
            }}>
              채팅
            </div>

            {/* 스크롤 룸 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {loadingRooms ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-sub)' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '0.85rem' }} />
                </div>
              ) : (
                <>
                  {/* 팀 채팅 */}
                  {teamRooms.length > 0 && (
                    <>
                      <SectionLabel>팀</SectionLabel>
                      {teamRooms.map(r => (
                        <RoomBtn key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => setActiveRoom(r)} />
                      ))}
                    </>
                  )}

                  {/* DM — 항상 표시 */}
                  <SectionLabel
                    action={
                      allMembers.length > 0 && (
                        <button
                          onClick={() => setDmPickerOpen(true)}
                          title="새 DM"
                          style={{
                            width: 18, height: 18, borderRadius: 5, border: 'none',
                            background: 'transparent', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-sub)', fontSize: '0.65rem',
                          }}
                        >
                          <i className="fas fa-plus" />
                        </button>
                      )
                    }
                  >
                    DM
                  </SectionLabel>

                  {dmRooms.length === 0 && allMembers.length === 0 && (
                    <p style={{ padding: '4px 10px 8px', margin: 0, fontSize: '0.7rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
                      팀에 가입하면 DM이 가능해요
                    </p>
                  )}
                  {dmRooms.length === 0 && allMembers.length > 0 && (
                    <button
                      onClick={() => setDmPickerOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        width: '100%', padding: '7px 10px', border: 'none',
                        background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                        color: 'var(--text-sub)', fontSize: '0.73rem',
                      }}
                    >
                      <i className="fas fa-plus-circle" style={{ color: '#818cf8' }} />
                      새 대화 시작
                    </button>
                  )}
                  {dmRooms.map(r => (
                    <RoomBtn key={r.id} room={r} active={activeRoom?.id === r.id} onClick={() => setActiveRoom(r)} />
                  ))}
                </>
              )}
            </div>

            {/* ── DM 멤버 선택 패널 (오버레이) ── */}
            {dmPickerOpen && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'var(--surface, #fff)',   /* 투명 방지: 명시적 폴백 */
                display: 'flex', flexDirection: 'column',
                zIndex: 10,
              }}>
                {/* 피커 헤더 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 8px 6px', flexShrink: 0,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <button
                    onClick={() => { setDmPickerOpen(false); setDmSearch(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: 2, flexShrink: 0 }}
                  >
                    <i className="fas fa-arrow-left" style={{ fontSize: '0.75rem' }} />
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>새 DM</span>
                </div>

                {/* 검색 */}
                <div style={{ padding: '6px 8px', flexShrink: 0 }}>
                  <input
                    ref={dmSearchRef}
                    value={dmSearch}
                    onChange={e => setDmSearch(e.target.value)}
                    placeholder="이름 검색…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '5px 8px', borderRadius: 7, fontSize: '0.75rem',
                      border: '1px solid var(--border)', background: 'var(--border-lt)',
                      color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>

                {/* 멤버 목록 */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  {pickerMembers.length === 0 ? (
                    <p style={{ padding: '12px 10px', fontSize: '0.72rem', color: 'var(--text-sub)', margin: 0 }}>
                      {dmSearch ? '검색 결과 없음' : '팀원이 없습니다'}
                    </p>
                  ) : pickerMembers.map(m => {
                    const alreadyDM = dmRooms.some(r => r.peerId === m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => startDM(m)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          width: '100%', padding: '7px 10px', border: 'none',
                          background: 'transparent', cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left', transition: 'background .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-lt)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Av name={m.label} colorIdx={m.colorIdx} size={26} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.label}
                          </div>
                          {alreadyDM && (
                            <div style={{ fontSize: '0.62rem', color: 'var(--indigo-400,#818cf8)' }}>대화 중</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 오른쪽: 메시지 창 ── */}
          <div style={{
            flex: 1, minWidth: 0, minHeight: 0,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {!activeRoom ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-sub)' }}>
                <i className="fas fa-comments" style={{ fontSize: '2rem', opacity: 0.2 }} />
                <p style={{ fontSize: '0.82rem', margin: 0 }}>채팅방을 선택하세요</p>
                {allMembers.length > 0 && (
                  <button
                    onClick={() => setDmPickerOpen(true)}
                    style={{
                      marginTop: 4, padding: '7px 16px', borderRadius: 9, border: '1px solid var(--border)',
                      background: 'var(--border-lt)', color: 'var(--text)', fontSize: '0.78rem',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <i className="fas fa-paper-plane" style={{ color: '#818cf8' }} />
                    새 DM 시작
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 헤더 */}
                <div style={{
                  padding: '10px 12px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                  background: 'var(--card)',
                }}>
                  <Av name={activeRoom.label} colorIdx={activeRoom.colorIdx} size={26} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeRoom.label}
                    </div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-sub)' }}>
                      {activeRoom.type === 'team' ? '팀 그룹채팅' : '개인 메시지'}
                    </div>
                  </div>
                  {/* DM 채팅일 때 + 버튼으로 새 DM 시작 */}
                  {activeRoom.type === 'dm' && allMembers.length > 0 && (
                    <button
                      onClick={() => setDmPickerOpen(true)}
                      title="새 DM"
                      style={{
                        width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
                        background: 'var(--border-lt)', color: 'var(--text-sub)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-plus" />
                    </button>
                  )}
                </div>

                {/* 메시지 */}
                <div style={{
                  flex: 1, minHeight: 0, overflowY: 'auto',
                  padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2,
                  background: 'var(--card)',
                }}>
                  {loadingMsgs ? (
                    <div style={{ textAlign: 'center', paddingTop: 24, color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                      <i className="fas fa-spinner fa-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', paddingTop: 28, color: 'var(--text-sub)', fontSize: '0.78rem' }}>
                      <i className="fas fa-comment-dots" style={{ fontSize: '1.4rem', opacity: 0.2, display: 'block', marginBottom: 8 }} />
                      {activeRoom.type === 'dm'
                        ? `${activeRoom.label}님에게 첫 메시지를 보내보세요!`
                        : '첫 메시지를 보내보세요!'}
                    </div>
                  ) : messages.map((msg, i) => {
                    const mine     = msg.sender_id === user.id;
                    const showName = !mine && (i === 0 || messages[i-1].sender_id !== msg.sender_id);
                    return (
                      <div key={msg.id} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: mine ? 'flex-end' : 'flex-start',
                        marginTop: showName ? 8 : 2,
                      }}>
                        {showName && (
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-sub)', marginBottom: 3, paddingLeft: 2 }}>
                            {msg.sender_name}
                          </span>
                        )}
                        <div style={{
                          maxWidth: '82%', padding: '7px 10px',
                          borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                          background: mine ? '#4f46e5' : 'var(--border-lt)',
                          color: mine ? '#fff' : 'var(--text)',
                          border: mine ? 'none' : '1px solid var(--border)',
                          fontSize: '0.82rem', lineHeight: 1.45, wordBreak: 'break-word',
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted,#9ca3af)', marginTop: 2 }}>
                          {fmtTime(msg.created_at)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* 입력 */}
                <form onSubmit={handleSend} style={{
                  flexShrink: 0, padding: '8px 10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 7, alignItems: 'center',
                  background: 'var(--card)',
                }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder={activeRoom.type === 'dm' ? `${activeRoom.label}에게 메시지…` : '메시지 입력…'}
                    style={{
                      flex: 1, minWidth: 0, padding: '8px 11px', borderRadius: 9,
                      border: '1px solid var(--border)', background: 'var(--border-lt)',
                      color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button type="submit" disabled={!input.trim() || sending} style={{
                    width: 34, height: 34, borderRadius: 9, border: 'none', flexShrink: 0,
                    background: input.trim() ? '#4f46e5' : 'var(--border)',
                    color: input.trim() ? '#fff' : 'var(--text-sub)',
                    cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s',
                  }}>
                    <i className="fas fa-paper-plane" style={{ fontSize: '0.75rem' }} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        onClick={() => setOpen(p => !p)}
        title="채팅"
        className={`widget-fab fab-chat-btn${open ? ' active' : ''}`}
        style={{
          width: 50, height: 50, borderRadius: '50%',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem',
        }}
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-comments'}`} />
      </button>
    </>
  );
}
