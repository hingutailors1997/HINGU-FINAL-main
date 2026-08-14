import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled runtime error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20">
              <AlertTriangle className="h-7 w-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                {this.props.fallbackTitle || "Module Encountered an Error"}
              </h3>
              <p className="text-xs text-muted-foreground">
                An unforeseen rendering or hardware DOM conflict occurred in this view. Your sidebar navigation and session remain fully secure and active.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-slate-950 text-rose-400 p-3 rounded-lg font-mono text-[11px] text-left overflow-x-auto max-h-32 border border-slate-800">
                <span className="font-semibold block text-slate-300 mb-1">Exception Details:</span>
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={this.handleReset}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Module
              </button>
              <Link
                to="/"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
