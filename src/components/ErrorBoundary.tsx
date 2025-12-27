'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-2 border-neon-orange bg-black/50">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-neon-orange" />
            <h2 className="mb-2 font-mono text-lg text-neon-orange">Something went wrong</h2>
            <p className="mb-4 font-mono text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              onClick={this.handleRetry}
              variant="outline"
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

// Simple error fallback component
export function ErrorFallback({
  error,
  resetError,
}: {
  error?: Error | null;
  resetError?: () => void;
}): React.ReactElement {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-neon-orange bg-black/50 p-8">
      <AlertCircle className="mb-4 h-10 w-10 text-neon-orange" />
      <p className="mb-2 font-mono text-neon-orange">Error loading component</p>
      {error?.message && <p className="mb-4 font-mono text-xs text-slate-500">{error.message}</p>}
      {resetError && (
        <Button
          onClick={resetError}
          variant="outline"
          size="sm"
          className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10"
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}

export default ErrorBoundary;
