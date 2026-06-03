'use client';
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          일시적인 오류가 발생했습니다
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: 24, maxWidth: 360, lineHeight: 1.6 }}>
          페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'var(--indigo-600)', color: '#fff',
              fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 20px', borderRadius: 9, cursor: 'pointer',
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)',
              fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            페이지 새로고침
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <pre style={{
            marginTop: 24, padding: '12px 16px', borderRadius: 8, maxWidth: '100%',
            overflow: 'auto', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.72rem', color: 'var(--red-500)', textAlign: 'left', lineHeight: 1.5,
          }}>
            {this.state.error.message}
          </pre>
        )}
      </div>
    );
  }
}
