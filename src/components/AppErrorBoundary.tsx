import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[Gina] Unhandled render error:', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-xl border border-red-500/30 bg-slate-950 p-6 shadow-2xl">
          <div className="text-[10px] uppercase tracking-[0.25em] text-red-400 font-bold">
            Gina startup error
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-100">The interface could not render.</h1>
          <p className="mt-2 text-sm text-slate-400">
            Gina caught the frontend exception instead of leaving a blank screen. Check the browser console
            for the full stack trace.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-black/40 p-3 text-xs text-red-300 whitespace-pre-wrap">
            {this.state.message || 'Unknown render error'}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
          >
            Reload Gina
          </button>
        </div>
      </div>
    );
  }
}
