'use client';
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { createTask } from '@/models/taskModel';

// ─── 상수 ────────────────────────────────────────────────
const MODES = [
  {
    id: 'student',
    label: '학생',
    icon: 'fa-graduation-cap',
    desc: '강의계획서·과제 공지·시험 일정에서 할 일을 추출합니다',
    color: 'var(--indigo-400, #818cf8)',
    placeholder: `예시:
• 3월 15일까지 1장 레포트 제출 (과제 1)
• 중간고사: 4월 10일 (범위: 1~5장)
• 다음주 월요일까지 독서 과제 제출
• 기말고사 6월 20일, 기말 프로젝트 제출 6월 15일`,
  },
  {
    id: 'work',
    label: '직장인',
    icon: 'fa-briefcase',
    desc: '회의록·메모에서 액션 아이템과 결정사항을 추출합니다',
    color: 'var(--green-500, #22c55e)',
    placeholder: `예시:
- [ ] 기획안 검토해주세요 / 담당: 김철수
- 결정 사항: 런칭일 6월 1일로 확정
- 다음주 수요일까지 디자인 시안 제출
○ 마케팅 자료 공유해 주세요`,
  },
];

const TYPE_LABEL = {
  assignment:   '과제',
  exam:         '시험',
  presentation: '발표',
  reading:      '독서',
  deadline:     '마감',
  action:       '액션',
  decision:     '결정',
  followup:     '후속',
};

const TYPE_COLOR = {
  assignment:   'var(--indigo-400,#818cf8)',
  exam:         'var(--red-500,#ef4444)',
  presentation: 'var(--amber-500,#f59e0b)',
  reading:      'var(--cyan-500,#06b6d4)',
  deadline:     'var(--red-500,#ef4444)',
  action:       'var(--green-500,#22c55e)',
  decision:     'var(--amber-500,#f59e0b)',
  followup:     'var(--text-sub)',
};

const PRIORITY_KO = { high: '높음', medium: '보통', low: '낮음' };
const PRIORITY_COLOR = { high: 'var(--red-500)', medium: 'var(--amber-500)', low: 'var(--green-500)' };

// ─── 서브 컴포넌트 ────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.62rem', fontWeight: 700,
      padding: '1px 7px', borderRadius: 999,
      color: TYPE_COLOR[type] ?? 'var(--text-sub)',
      background: (TYPE_COLOR[type] ?? 'var(--bg-sub)') + '20',
      border: `1px solid ${(TYPE_COLOR[type] ?? 'var(--border)')}40`,
      flexShrink: 0,
    }}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.62rem', fontWeight: 700,
      padding: '1px 7px', borderRadius: 999,
      color: PRIORITY_COLOR[priority] ?? 'var(--text-sub)',
      background: (PRIORITY_COLOR[priority] ?? 'var(--bg-sub)') + '1a',
      border: `1px solid ${(PRIORITY_COLOR[priority] ?? 'var(--border)')}40`,
      flexShrink: 0,
    }}>
      {PRIORITY_KO[priority] ?? priority}
    </span>
  );
}

function ItemCard({ item, onToggle, onDateChange }) {

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '11px 13px', borderRadius: 11,
      background: item.accepted ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${item.accepted ? 'rgba(99,102,241,0.22)' : 'var(--border)'}`,
      opacity: item.accepted ? 1 : 0.45,
      transition: 'all .15s',
    }}>
      {/* 체크박스 */}
      <button
        onClick={onToggle}
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 6, marginTop: 2,
          border: `2px solid ${item.accepted ? 'var(--indigo-600,#4f46e5)' : 'var(--border)'}`,
          background: item.accepted ? 'var(--indigo-600,#4f46e5)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .12s',
        }}
      >
        {item.accepted && <i className="fas fa-check" style={{ fontSize: '0.6rem', color: '#fff' }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 뱃지 행 */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
          <TypeBadge type={item.type} />
          <PriorityBadge priority={item.priority} />
          {item.assignee && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', padding: '1px 7px', background: 'var(--bg-sub)', borderRadius: 999 }}>
              👤 {item.assignee}
            </span>
          )}
        </div>

        {/* 제목 */}
        <p style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.4 }}>
          {item.title}
        </p>

        {/* 날짜 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-calendar-day" style={{ fontSize: '0.7rem', color: item.date ? 'var(--indigo-400,#818cf8)' : 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="date"
            value={item.date || ''}
            onChange={e => onDateChange(e.target.value)}
            style={{
              background: 'transparent', border: 'none', fontSize: '0.75rem',
              color: item.date ? 'var(--indigo-400,#818cf8)' : 'var(--text-sub)',
              cursor: 'pointer', padding: 0, outline: 'none', fontFamily: 'inherit',
            }}
          />
          {!item.date && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>날짜를 지정하세요</span>
          )}
        </div>

        {/* 원문 */}
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.35, fontStyle: 'italic' }}>
          "{item.raw.slice(0, 80)}{item.raw.length > 80 ? '…' : ''}"
        </p>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function ToolsPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [mode,       setMode]       = useState('student');
  const [inputMode,  setInputMode]  = useState('text'); // 'text' | 'pdf'
  const [text,       setText]       = useState('');
  const [items,      setItems]      = useState(null);  // null = 분석 전
  const [loading,    setLoading]    = useState(false);
  const [pdfName,    setPdfName]    = useState('');
  const [phase,      setPhase]      = useState('idle'); // idle | analyzing | saving | done | error
  const [errMsg,     setErrMsg]     = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const fileRef = useRef(null);

  const currentMode = MODES.find(m => m.id === mode);

  // ── PDF 업로드 ─────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setErrMsg('PDF 파일만 지원합니다.');
      return;
    }
    setPdfName(file.name);
    setLoading(true);
    setErrMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'PDF 파싱 실패');
      setText(json.text);
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── 분석 ──────────────────────────────────────────────
  async function handleAnalyze() {
    if (!text.trim()) return;
    setPhase('analyzing');
    setErrMsg('');
    try {
      const res  = await fetch('/api/analyze-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, mode, today }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '분석 실패');
      setItems(json.items ?? []);
      setPhase('idle');
    } catch (e) {
      setErrMsg(e.message);
      setPhase('error');
    }
  }

  function toggleItem(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, accepted: !i.accepted } : i));
  }

  function setItemDate(id, date) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, date, deadline: date } : i));
  }

  // ── 할 일 저장 ─────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    const toSave = items.filter(i => i.accepted);
    if (toSave.length === 0) return;
    setPhase('saving');
    setErrMsg('');
    try {
      await Promise.all(
        toSave.map(item =>
          createTask({
            user_id:   user.id,
            title:     item.title,
            date:      item.date || today,
            deadline:  item.deadline || null,
            priority:  item.priority,
            completed: false,
            category:  mode === 'student' ? '학업' : '업무',
          })
        )
      );
      setSavedCount(toSave.length);
      setPhase('done');
    } catch (e) {
      setErrMsg(`저장 실패: ${e.message}`);
      setPhase('error');
    }
  }

  function reset() {
    setText('');
    setItems(null);
    setPdfName('');
    setPhase('idle');
    setErrMsg('');
    setSavedCount(0);
    if (fileRef.current) fileRef.current.value = '';
  }

  const acceptedCount = items ? items.filter(i => i.accepted).length : 0;

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div className="page-wrapper" style={{ maxWidth: 740, margin: '0 auto' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>
          <i className="fas fa-wand-magic-sparkles" style={{ marginRight: 10, color: 'var(--indigo-400,#818cf8)' }} />
          AI 도구
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', margin: 0 }}>
          PDF·텍스트에서 할 일을 자동으로 추출해 캘린더에 추가합니다
        </p>
      </div>

      {/* 모드 선택 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); reset(); }}
            style={{
              padding: '14px 16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${mode === m.id ? m.color : 'var(--border)'}`,
              background: mode === m.id ? m.color + '12' : 'var(--card)',
              transition: 'all .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <i className={`fas ${m.icon}`} style={{ color: mode === m.id ? m.color : 'var(--text-sub)', fontSize: '0.95rem' }} />
              <span style={{ fontWeight: 700, color: mode === m.id ? 'var(--text)' : 'var(--text-sub)', fontSize: '0.9rem' }}>
                {m.label} 모드
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.4 }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* 완료 화면 */}
      {phase === 'done' ? (
        <div style={{
          padding: '48px 24px', borderRadius: 16, textAlign: 'center',
          background: 'var(--card)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--green-500)', marginBottom: 8 }}>
            {savedCount}개 할 일이 추가되었습니다!
          </p>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-sub)', marginBottom: 20 }}>
            캘린더와 할일 페이지에서 확인하세요
          </p>
          <button className="btn-primary" onClick={reset}>
            <i className="fas fa-plus" style={{ marginRight: 7 }} /> 새로 분석하기
          </button>
        </div>
      ) : (
        <>
          {/* 입력 방법 탭 */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 14, background: 'var(--bg-sub,rgba(0,0,0,0.05))', borderRadius: 10, padding: 4 }}>
            {[
              { id: 'text', icon: 'fa-align-left', label: '텍스트 붙여넣기' },
              { id: 'pdf',  icon: 'fa-file-pdf',   label: 'PDF 업로드' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setInputMode(t.id)}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: inputMode === t.id ? 'var(--card)' : 'transparent',
                  color: inputMode === t.id ? 'var(--text)' : 'var(--text-sub)',
                  fontWeight: inputMode === t.id ? 700 : 400,
                  fontSize: '0.82rem', transition: 'all .12s',
                  boxShadow: inputMode === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <i className={`fas ${t.icon}`} style={{ marginRight: 6 }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* PDF 업로드 */}
          {inputMode === 'pdf' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '28px 20px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                border: `2px dashed ${pdfName ? 'var(--indigo-400,#818cf8)' : 'var(--border)'}`,
                background: pdfName ? 'rgba(99,102,241,0.04)' : 'var(--card)',
                marginBottom: 14, transition: 'all .15s',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              {loading ? (
                <>
                  <div style={{
                    width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)',
                    borderTopColor: 'var(--indigo-600)', borderRadius: '50%',
                    animation: 'spin-slow .7s linear infinite', margin: '0 auto 10px',
                  }} />
                  <p style={{ color: 'var(--text-sub)', fontSize: '0.84rem' }}>PDF 텍스트 추출 중…</p>
                </>
              ) : pdfName ? (
                <>
                  <i className="fas fa-file-pdf" style={{ fontSize: '2rem', color: 'var(--indigo-400,#818cf8)', marginBottom: 8 }} />
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 4 }}>{pdfName}</p>
                  <p style={{ fontSize: '0.77rem', color: 'var(--text-sub)' }}>
                    {text.length.toLocaleString()} 자 추출됨 · 다른 파일을 선택하려면 클릭
                  </p>
                </>
              ) : (
                <>
                  <i className="fas fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--text-sub)', marginBottom: 8 }} />
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 4 }}>
                    PDF를 여기에 드래그하거나 클릭해서 선택
                  </p>
                  <p style={{ fontSize: '0.77rem', color: 'var(--text-sub)' }}>최대 10 MB · 텍스트 기반 PDF만 지원</p>
                </>
              )}
            </div>
          )}

          {/* 텍스트 입력 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              {inputMode === 'pdf' ? 'PDF에서 추출된 텍스트 (편집 가능)' : '텍스트 붙여넣기'}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={currentMode.placeholder}
              rows={8}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--text)',
                fontSize: '0.84rem', fontFamily: 'inherit', lineHeight: 1.55,
                resize: 'vertical', outline: 'none',
              }}
            />
          </div>

          {/* 오류 */}
          {errMsg && (
            <div style={{
              padding: '9px 13px', borderRadius: 9, marginBottom: 12,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: '0.82rem', color: 'var(--red-500)',
            }}>
              <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />
              {errMsg}
            </div>
          )}

          {/* 분석 버튼 */}
          {items === null && (
            <button
              className="btn-primary"
              disabled={!text.trim() || phase === 'analyzing'}
              onClick={handleAnalyze}
              style={{ width: '100%', justifyContent: 'center', opacity: !text.trim() ? 0.4 : 1 }}
            >
              {phase === 'analyzing' ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin-slow .7s linear infinite', marginRight: 8,
                  }} />
                  분석 중…
                </>
              ) : (
                <>
                  <i className="fas fa-magnifying-glass" style={{ marginRight: 8 }} />
                  할 일 자동 추출
                </>
              )}
            </button>
          )}

          {/* 결과 */}
          {items !== null && (
            <div style={{ marginTop: 20 }}>
              {/* 요약 배너 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: items.length > 0 ? 'rgba(99,102,241,0.07)' : 'rgba(34,197,94,0.07)',
                border: `1px solid ${items.length > 0 ? 'rgba(99,102,241,0.22)' : 'rgba(34,197,94,0.22)'}`,
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                    {items.length > 0
                      ? `${items.length}개 항목 감지됨`
                      : '추출된 항목이 없습니다'}
                  </span>
                  {items.length > 0 && (
                    <span style={{ fontSize: '0.77rem', color: 'var(--text-sub)', marginLeft: 10 }}>
                      날짜 있음 {items.filter(i => i.date).length}개
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {items.length > 0 && (
                    <>
                      <button
                        onClick={() => setItems(prev => prev.map(i => ({ ...i, accepted: true })))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--indigo-400,#818cf8)', fontFamily: 'inherit', padding: '2px 6px' }}
                      >전체 선택</button>
                      <button
                        onClick={() => setItems(prev => prev.map(i => ({ ...i, accepted: false })))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-sub)', fontFamily: 'inherit', padding: '2px 6px' }}
                      >전체 해제</button>
                    </>
                  )}
                  <button
                    onClick={reset}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-sub)', fontFamily: 'inherit', padding: '2px 6px' }}
                  >
                    <i className="fas fa-rotate-left" style={{ marginRight: 4 }} />다시
                  </button>
                </div>
              </div>

              {/* 아이템 목록 */}
              {items.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {items.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={() => toggleItem(item.id)}
                        onDateChange={(d) => setItemDate(item.id, d)}
                      />
                    ))}
                  </div>

                  <button
                    className="btn-primary"
                    disabled={acceptedCount === 0 || phase === 'saving'}
                    onClick={handleSave}
                    style={{ width: '100%', justifyContent: 'center', opacity: acceptedCount === 0 ? 0.4 : 1 }}
                  >
                    {phase === 'saving' ? (
                      <>
                        <div style={{
                          width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'spin-slow .7s linear infinite', marginRight: 8,
                        }} />
                        저장 중…
                      </>
                    ) : (
                      <>
                        <i className="fas fa-calendar-plus" style={{ marginRight: 8 }} />
                        {acceptedCount}개 할 일로 추가
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-sub)', fontSize: '0.84rem' }}>
                  <i className="fas fa-face-meh" style={{ fontSize: '1.8rem', marginBottom: 10, display: 'block', opacity: 0.5 }} />
                  인식된 할 일이 없습니다.<br />
                  텍스트를 다듬거나 다른 모드를 시도해 보세요.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
