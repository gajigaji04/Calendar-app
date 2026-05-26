'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getUserTeams, createTeam, joinTeamByCode, deleteTeam, leaveTeam } from '@/models/teamModel';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [teams,      setTeams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // 'create' | 'join'
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [code,       setCode]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setTeams(await getUserTeams(user.id)); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openModal(type) { setModal(type); setName(''); setDesc(''); setCode(''); setErr(''); }
  function closeModal() { setModal(null); setErr(''); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setErr('');
    try {
      await createTeam(name.trim(), desc.trim(), user.id, displayName, user.email);
      closeModal(); load();
    } catch (ex) { setErr(ex.message); }
    finally { setSaving(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true); setErr('');
    try {
      await joinTeamByCode(code.trim(), user.id, displayName, user.email);
      closeModal(); load();
    } catch (ex) { setErr(ex.message); }
    finally { setSaving(false); }
  }

  async function handleLeave(team) {
    if (!confirm(`"${team.name}" 팀을 탈퇴하시겠습니까?`)) return;
    await leaveTeam(team.id, user.id);
    load();
  }

  async function handleDelete(team) {
    if (!confirm(`"${team.name}" 팀을 삭제하시겠습니까? 모든 멤버가 탈퇴됩니다.`)) return;
    await deleteTeam(team.id);
    load();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="view-header">
        <div>
          <h2>팀</h2>
          <p className="view-sub">팀을 만들고 캘린더를 공유하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => openModal('join')}>
            <i className="fas fa-link" /> 코드로 참여
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <i className="fas fa-plus" /> 팀 만들기
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-sub)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem' }} />
          </div>
        ) : teams.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-sub)' }}>
            <i className="fas fa-users" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12, color: 'var(--border)' }} />
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>아직 속한 팀이 없습니다</div>
            <div style={{ fontSize: '0.85rem' }}>팀을 만들거나 초대 코드로 참여해보세요</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {teams.map((team, i) => {
              const isOwner = team.owner_id === user.id;
              return (
                <div key={team.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    height: 6,
                    background: `linear-gradient(90deg, ${TEAM_GRADIENTS[i % TEAM_GRADIENTS.length]})`,
                  }} />
                  <div style={{ padding: '16px 18px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.3 }}>
                        {team.name}
                      </div>
                      {isOwner && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px',
                          borderRadius: 6, background: 'var(--primary-lt)', color: 'var(--primary)',
                          flexShrink: 0,
                        }}>팀장</span>
                      )}
                    </div>
                    {team.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: 10,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {team.description}
                      </p>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: 14, display: 'flex', gap: 12 }}>
                      <span><i className="fas fa-key" style={{ marginRight: 4 }} />{team.invite_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/teams/${team.id}`)}
                      >
                        <i className="fas fa-calendar" /> 캘린더 보기
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--red-500)' }}
                        onClick={() => isOwner ? handleDelete(team) : handleLeave(team)}
                        title={isOwner ? '팀 삭제' : '팀 탈퇴'}
                      >
                        <i className={`fas fa-${isOwner ? 'trash' : 'right-from-bracket'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal === 'create' && (
        <Modal title="팀 만들기" onClose={closeModal}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>팀 이름 *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="예: 프론트엔드팀" required autoFocus
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
            </div>
            <div className="form-group">
              <label>설명</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                rows={2} placeholder="팀 설명 (선택)" style={{ resize: 'vertical' }} />
            </div>
            {err && <div style={{ color: 'var(--red-500)', fontSize: '0.82rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={closeModal}>취소</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? '생성 중...' : '팀 만들기'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'join' && (
        <Modal title="초대 코드로 참여" onClose={closeModal}>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>초대 코드 *</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)}
                placeholder="8자리 초대 코드 입력" required autoFocus maxLength={20}
                style={{ letterSpacing: '0.08em', fontFamily: 'monospace' }}
                onKeyDown={e => e.key === 'Enter' && e.preventDefault()} />
            </div>
            {err && <div style={{ color: 'var(--red-500)', fontSize: '0.82rem' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={closeModal}>취소</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? '참여 중...' : '참여하기'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const TEAM_GRADIENTS = [
  '#6366f1, #8b5cf6',
  '#ef4444, #f97316',
  '#22c55e, #06b6d4',
  '#f59e0b, #eab308',
  '#ec4899, #a855f7',
  '#0ea5e9, #6366f1',
];
