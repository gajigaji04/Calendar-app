'use client';
import { useState, useEffect } from 'react';
import { analyzeSchedule, formatDateKo } from '@/lib/scheduleOptimizer';
import { updateTask } from '@/models/taskModel';

const PRIORITY_COLOR = { high: 'var(--red-500)', medium: 'var(--amber-500)', low: 'var(--green-500)' };
const PRIORITY_KO    = { high: '높음', medium: '보통', low: '낮음' };

/* ── 작은 배지 ── */
function PBadge({ priority }) {
  if (!priority) return null;
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.65rem', fontWeight: 700,
      padding: '1px 7px', borderRadius: 999,
      color: PRIORITY_COLOR[priority] ?? 'var(--text-sub)',
      background: (PRIORITY_COLOR[priority] ?? 'transparent') + '1a',
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? 'var(--border)')}40`,
    }}>
      {PRIORITY_KO[priority] ?? priority}
    </span>
  );
}

/* ── 날짜 화살표 칩 ── */
function DateArrow({ from, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--red-500)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {formatDateKo(from)}
      </span>
      <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }} />
      <span style={{ fontSize: '0.78rem', color: 'var(--green-500)', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {formatDateKo(to)}
      </span>
    </div>
  );
}

/* ── 제안 카드 ── */
function ProposalCard({ proposal, onToggle }) {
  const { task, fromDate, toDate, reason, accepted } = proposal;
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 12,
      background: accepted ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${accepted ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
      opacity: accepted ? 1 : 0.5,
      transition: 'all .15s',
    }}>
      {/* 체크박스 */}
      <button
        onClick={onToggle}
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 6, marginTop: 2,
          border: `2px solid ${accepted ? 'var(--indigo-600)' : 'var(--border)'}`,
          background: accepted ? 'var(--indigo-600)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .12s',
        }}
      >
        {accepted && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#fff' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 제목 + 배지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px',
          }}>
            {task.title}
          </span>
          <PBadge priority={task.priority} />
        </div>
        {/* 날짜 이동 */}
        <DateArrow from={fromDate} to={toDate} />
        {/* 이유 */}
        <p style={{ fontSize: '0.73rem', color: 'var(--text-sub)', marginTop: 5, lineHeight: 1.4 }}>
          <i className="fas fa-circle-info" style={{ marginRight: 4, opacity: 0.6 }} />
          {reason}
        </p>
      </div>
    </div>
  );
}

/* ── 메인 모달 ── */
export default function SmartRescheduleModal({ tasks, today, onClose, onApplied }) {
  const [phase,     setPhase]     = useState('analyzing'); // analyzing | result | applying | done
  const [result,    setResult]    = useState(null);
  const [proposals, setProposals] = useState([]);
  const [applyErr,  setApplyErr]  = useState('');

  /* 분석 (약간의 지연으로 UX 개선) */
  useEffect(() => {
    const t = setTimeout(() => {
      const res = analyzeSchedule(tasks, today);
      setResult(res);
      setProposals(res.proposals);
      setPhase('result');
    }, 600);
    return () => clearTimeout(t);
  }, [tasks, today]);

  function toggleProposal(id) {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, accepted: !p.accepted } : p));
  }

  function toggleAll(accepted) {
    setProposals(prev => prev.map(p => ({ ...p, accepted })));
  }

  const acceptedCount = proposals.filter(p => p.accepted).length;

  async function handleApply() {
    const toApply = proposals.filter(p => p.accepted);
    if (toApply.length === 0) return;
    setPhase('applying');
    setApplyErr('');
    try {
      await Promise.all(
        toApply.map(p => updateTask(p.task.id, { date: p.toDate }))
      );
      setPhase('done');
      setTimeout(() => {
        onApplied?.();
        onClose();
      }, 1800);
    } catch (err) {
      setApplyErr(`오류: ${err.message}`);
      setPhase('result');
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && phase !== 'applying' && onClose()}
    >
      <div className="modal-card" style={{ maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-wand-magic-sparkles" style={{ color: 'var(--indigo-400,#818cf8)', fontSize: '0.9rem' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                스마트 일정 재배치
              </h3>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-sub)', margin: 0 }}>
                과부하 날짜를 감지해 최적 시간표를 제안합니다
              </p>
            </div>
          </div>
          {phase !== 'applying' && (
            <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
          )}
        </div>

        {/* ── 분석 중 ── */}
        {phase === 'analyzing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 16 }}>
            <div style={{
              width: 44, height: 44, border: '3px solid rgba(99,102,241,0.25)',
              borderTopColor: 'var(--indigo-600)', borderRadius: '50%',
              animation: 'spin-slow .7s linear infinite',
            }} />
            <p style={{ color: 'var(--text-sub)', fontSize: '0.88rem' }}>일정 패턴 분석 중...</p>
          </div>
        )}

        {/* ── 적용 중 ── */}
        {phase === 'applying' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 16 }}>
            <div style={{
              width: 44, height: 44, border: '3px solid rgba(99,102,241,0.25)',
              borderTopColor: 'var(--indigo-600)', borderRadius: '50%',
              animation: 'spin-slow .7s linear infinite',
            }} />
            <p style={{ color: 'var(--text-sub)', fontSize: '0.88rem' }}>
              {acceptedCount}개 일정 재배치 적용 중...
            </p>
          </div>
        )}

        {/* ── 완료 ── */}
        {phase === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
            <div style={{ fontSize: '2.8rem' }}>✅</div>
            <p style={{ color: 'var(--green-500)', fontWeight: 700, fontSize: '1rem' }}>재배치 완료!</p>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.82rem' }}>일정이 최적화되었습니다.</p>
          </div>
        )}

        {/* ── 결과 ── */}
        {phase === 'result' && result && (
          <>
            {/* 요약 배너 */}
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, marginBottom: 14,
              background: result.stats.proposalCount > 0
                ? 'rgba(99,102,241,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${result.stats.proposalCount > 0
                ? 'rgba(99,102,241,0.25)' : 'rgba(34,197,94,0.25)'}`,
            }}>
              <i className={`fas ${result.stats.proposalCount > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}
                style={{
                  color: result.stats.proposalCount > 0 ? 'var(--amber-500)' : 'var(--green-500)',
                  marginTop: 2, flexShrink: 0,
                }} />
              <div>
                {result.stats.proposalCount > 0 ? (
                  <>
                    <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {result.stats.overloadCount}일의 과부하 감지 — {result.stats.proposalCount}개 재배치 제안
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: '3px 0 0' }}>
                      수락/거절 후 선택 적용하세요
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      모든 일정이 잘 분산되어 있어요 👍
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: '3px 0 0' }}>
                      {result.stats.totalFuture}개 예정 일정 분석 완료
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 경고 섹션 */}
            {result.warnings.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚠ 마감 임박 주의
                </p>
                {result.warnings.map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    fontSize: '0.78rem', color: 'var(--amber-500)',
                  }}>
                    <i className="fas fa-clock" style={{ marginTop: 1, flexShrink: 0 }} />
                    <span><b>{w.title}</b> — {w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 제안 목록 */}
            {proposals.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    재배치 제안 ({proposals.length}개)
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleAll(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--indigo-400,#818cf8)', fontFamily: 'inherit', padding: '2px 6px' }}>
                      전체 수락
                    </button>
                    <button
                      onClick={() => toggleAll(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-sub)', fontFamily: 'inherit', padding: '2px 6px' }}>
                      전체 거절
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, paddingRight: 2 }}>
                  {proposals.map(p => (
                    <ProposalCard key={p.id} proposal={p} onToggle={() => toggleProposal(p.id)} />
                  ))}
                </div>
              </>
            )}

            {/* 오류 */}
            {applyErr && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.8rem', color: 'var(--red-500)', marginBottom: 12 }}>
                {applyErr}
              </div>
            )}

            {/* 푸터 버튼 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button className="btn-secondary" onClick={onClose}>닫기</button>
              {proposals.length > 0 && (
                <button
                  className="btn-primary"
                  disabled={acceptedCount === 0}
                  onClick={handleApply}
                  style={{ opacity: acceptedCount === 0 ? 0.4 : 1 }}
                >
                  <i className="fas fa-wand-magic-sparkles" style={{ marginRight: 7 }} />
                  {acceptedCount}개 적용
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
