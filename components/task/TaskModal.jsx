'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { createTask, updateTask, deleteTask, deleteRecurringSeries } from '@/models/taskModel';

const COLORS = ['', '#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899','#64748b','#000000'];
const COLOR_LABELS = ['없음','빨강','주황','노랑','초록','하늘','보라','핑크','분홍','슬레이트','검정'];
const RECURRENCE_LABELS = { daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년' };

export default function TaskModal({ task, defaultDate, onClose, onSave }) {
  const { user } = useAuth();
  const isEdit = Boolean(task?.id);

  const [title,        setTitle]        = useState(task?.title || '');
  const [desc,         setDesc]         = useState(task?.description || '');
  const [date,         setDate]         = useState(task?.date || defaultDate || '');
  const [deadline,     setDeadline]     = useState(task?.deadline || '');
  const [dueTime,      setDueTime]      = useState(task?.due_time || '');
  const [priority,     setPriority]     = useState(task?.priority || 'medium');
  const [color,        setColor]        = useState(task?.color || '');
  const [completed,    setCompleted]    = useState(task?.completed || false);
  const [recurrence,   setRecurrence]   = useState('none');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [saving,       setSaving]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!date) { alert('날짜를 선택해주세요.'); return; }
    setSaving(true);
    const data = {
      title: title.trim(),
      description: desc.trim() || null,
      date,
      due_time: dueTime || null,
      deadline: deadline || null,
      priority,
      color: color || null,
      completed,
      user_id: user.id,
    };
    if (!isEdit) {
      data.recurrence = recurrence;
      data.recurrence_end = recurrenceEnd || null;
    }
    try {
      if (isEdit) await updateTask(task.id, data);
      else await createTask(data);
      onSave();
    } catch (err) {
      if (err.message?.includes("recurrence")) {
        alert('반복 일정 기능을 사용하려면 먼저 Supabase에서 컬럼 추가 SQL을 실행해주세요.\n\nALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT \'none\', ADD COLUMN IF NOT EXISTS recurrence_end DATE, ADD COLUMN IF NOT EXISTS recurrence_id UUID;\n\n그 후 NOTIFY pgrst, \'reload schema\'; 도 실행하세요.');
      } else {
        alert(`오류: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('할일을 삭제하시겠습니까?')) return;
    if (task.recurrence_id) {
      const deleteAll = confirm('반복 시리즈 전체를 삭제하시겠습니까?\n\n확인: 시리즈 전체 삭제\n취소: 이 할일만 삭제');
      if (deleteAll) await deleteRecurringSeries(task.recurrence_id);
      else await deleteTask(task.id);
    } else {
      await deleteTask(task.id);
    }
    onSave();
  }

  const isRecurring = isEdit && task.recurrence && task.recurrence !== 'none';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            {isEdit ? '할일 수정' : '할일 추가'}
          </h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="할일 제목을 입력하세요" required
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            />
          </div>

          <div className="form-group">
            <label>메모</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="추가 메모 (선택)"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>날짜 *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>마감 시간</label>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>마감일</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          {/* 반복 설정: 추가 모드만 */}
          {!isEdit && (
            <div style={{ display: 'grid', gridTemplateColumns: recurrence !== 'none' ? '1fr 1fr' : '1fr', gap: 12 }}>
              <div className="form-group">
                <label>반복</label>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                  <option value="none">없음</option>
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                  <option value="yearly">매년</option>
                </select>
              </div>
              {recurrence !== 'none' && (
                <div className="form-group">
                  <label>반복 종료일</label>
                  <input type="date" value={recurrenceEnd} min={date} onChange={e => setRecurrenceEnd(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* 반복 정보 배지: 수정 모드에서 반복 일정인 경우 */}
          {isRecurring && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 10px', borderRadius: 8,
              background: 'var(--primary-lt)', fontSize: '0.82rem', color: 'var(--primary)',
            }}>
              <i className="fas fa-repeat" />
              반복 일정 ({RECURRENCE_LABELS[task.recurrence]})
              {task.recurrence_end && <span style={{ opacity: 0.75 }}> · {task.recurrence_end}까지</span>}
            </div>
          )}

          <div className="form-group">
            <label>우선순위</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: 8 }}>
              색상 레이블
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLORS.map((c, i) => (
                <button
                  key={c || 'none'}
                  type="button"
                  title={COLOR_LABELS[i]}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                    background: c || 'var(--border)',
                    border: `2px solid ${color === c ? 'var(--indigo-600)' : 'transparent'}`,
                    outline: color === c ? '2px solid var(--indigo-300)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--indigo-600)' }}
              />
              완료로 표시
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            {isEdit && (
              <button
                type="button" onClick={handleDelete}
                className="btn-secondary"
                style={{ marginRight: 'auto', color: 'var(--red-500)', borderColor: 'var(--red-500)' }}
              >
                <i className="fas fa-trash" /> 삭제
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '저장 중...' : (isEdit ? '수정' : (recurrence !== 'none' ? '반복 추가' : '추가'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
