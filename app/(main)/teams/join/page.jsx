'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { joinTeamByCode } from '@/models/teamModel';

function Spinner() {
  return (
    <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin-slow .7s linear infinite', margin: '0 auto 20px' }} />
  );
}

function JoinTeamInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const code = searchParams.get('code') || '';

  const [status, setStatus] = useState('idle');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/teams/join?code=${code}`)}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMsg('초대 코드가 없습니다. 링크를 다시 확인해주세요.');
      return;
    }

    if (status !== 'idle') return;

    setStatus('joining');
    const displayName = user.user_metadata?.name || user.email?.split('@')[0] || '사용자';

    joinTeamByCode(code, user.id, displayName, user.email)
      .then(team => {
        setStatus('success');
        setMsg(team.name);
        setTimeout(() => router.replace('/teams'), 2000);
      })
      .catch(err => {
        setStatus('error');
        const m = err.message || '';
        if (m.includes('이미')) {
          setMsg('이미 이 팀의 멤버입니다.');
          setTimeout(() => router.replace('/teams'), 2000);
        } else if (m.includes('올바르지')) {
          setMsg('초대 코드가 올바르지 않습니다. 링크가 만료됐을 수 있습니다.');
        } else {
          setMsg(m || '팀 참여에 실패했습니다.');
        }
      });
  }, [user, loading, code, router, status]);

  return (
    <div style={{
      textAlign: 'center', maxWidth: 360, width: '100%',
      background: 'var(--card, rgba(255,255,255,0.04))',
      border: '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 20, padding: '40px 32px',
    }}>
      {(status === 'idle' || status === 'joining') && (
        <>
          <Spinner />
          <p style={{ color: 'var(--text-sub, rgba(255,255,255,0.5))', fontSize: 15 }}>
            {loading ? '로딩 중...' : '팀에 참여하는 중...'}
          </p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text, #f0f0ff)', marginBottom: 8 }}>
            팀 참여 완료!
          </h2>
          <p style={{ color: 'var(--text-sub, rgba(255,255,255,0.5))', fontSize: 14 }}>
            <strong style={{ color: '#a5b4fc' }}>{msg}</strong> 팀에 합류했습니다.<br />잠시 후 팀 목록으로 이동합니다.
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text, #f0f0ff)', marginBottom: 8 }}>
            참여 실패
          </h2>
          <p style={{ color: 'var(--text-sub, rgba(255,255,255,0.5))', fontSize: 14, marginBottom: 20 }}>
            {msg}
          </p>
          <button
            onClick={() => router.replace('/teams')}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            팀 목록으로 →
          </button>
        </>
      )}
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',sans-serif",
    }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>로딩 중...</p>
        </div>
      }>
        <JoinTeamInner />
      </Suspense>
    </div>
  );
}
