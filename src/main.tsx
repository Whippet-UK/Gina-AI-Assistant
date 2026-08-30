import {Component, StrictMode, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

class RootErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Gina] React startup/runtime error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || 'Unknown React runtime error';
    const stack = this.state.error?.stack || '';

    return (
      <div style={{minHeight: '100vh', padding: 32, background: '#030712', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif'}}>
        <div style={{maxWidth: 1000, margin: '0 auto', border: '1px solid #374151', borderRadius: 12, padding: 24, background: '#111827'}}>
          <h1 style={{marginTop: 0, color: '#f87171'}}>Gina failed to render</h1>
          <p>The dashboard process is running, but the React application threw an error.</p>
          <pre style={{whiteSpace: 'pre-wrap', overflowX: 'auto', padding: 16, borderRadius: 8, background: '#030712', color: '#fca5a5'}}>{message}</pre>
          {stack && <details><summary>Technical details</summary><pre style={{whiteSpace: 'pre-wrap', overflowX: 'auto'}}>{stack}</pre></details>}
          <p style={{marginBottom: 0}}>Check the <strong>Gina Dashboard</strong> terminal for the corresponding error.</p>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Gina startup failed: #root element was not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
