import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-xl bg-card border border-border p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong</h2>
            <p className="mb-4 text-muted-foreground">
              An error occurred while rendering this page.
            </p>
            <pre className="mb-6 overflow-auto rounded bg-muted p-4 text-xs text-foreground">
              {this.state.error?.message}
            </pre>
            <button
              className="rounded bg-foreground px-4 py-2 text-background hover:bg-foreground/90"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
