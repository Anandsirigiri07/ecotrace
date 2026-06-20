import React, { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen bg-mintBg dark:bg-gray-900 p-8 text-center transition-all">
          <div className="text-6xl mb-4" aria-hidden="true">🌿</div>
          <h2 className="text-2xl font-bold text-primary dark:text-accent mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-textSecondary dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {this.state.error?.message || 'Unexpected application error occurred.'}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={this.handleReset}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-semibold active:scale-95 transition-all text-xs cursor-pointer border-none shadow-sm"
              aria-label="Reset and recover the application state"
            >
              Recover App
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-textSecondary dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-6 py-2.5 rounded-full font-semibold active:scale-95 transition-all text-xs cursor-pointer"
              aria-label="Reload the application"
            >
              Full Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
