import React from 'react';

interface WorkspaceErrorBoundaryProps {
  name: string;
  children: React.ReactNode;
}

interface WorkspaceErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class WorkspaceErrorBoundary extends React.Component<WorkspaceErrorBoundaryProps, WorkspaceErrorBoundaryState> {
  state: WorkspaceErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): WorkspaceErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error || 'Unknown workspace error')
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error(`[Gina] ${this.props.name} workspace crashed`, error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="bg-slate-950 border border-rose-500/40 rounded-xl p-5 text-slate-200 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-rose-300">
              {this.props.name} stopped rendering
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              The rest of Gina is still running. The failing workspace was isolated so one bad AIDA64/Create payload cannot blank the whole application.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-black/40 border border-slate-800 p-3 text-[10px] text-rose-200 font-mono whitespace-pre-wrap">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-3 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Reload {this.props.name}
            </button>
          </div>
        </div>
      </section>
    );
  }
}
