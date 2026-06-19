import React, { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-8 text-center">
          <div className="text-6xl mb-4">🌿</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            {this.state.error?.message || 'Unexpected error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-800 transition-all"
            aria-label="Reload the application"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
