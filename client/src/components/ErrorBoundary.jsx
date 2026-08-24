import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
          <div style={{ maxWidth: 520, width: '100%', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 24 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>页面加载出错</h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>{this.state.error.message}</p>
            <pre style={{ fontSize: 12, color: '#999', background: '#f5f5f5', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { sessionStorage.clear(); window.location.href = '/admin'; }}
              style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, background: '#187a55', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
