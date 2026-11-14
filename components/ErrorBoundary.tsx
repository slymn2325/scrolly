'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorFallbackView from '@/components/ErrorFallbackView';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: error instanceof Error ? error : new Error('Unexpected client error'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Scrolly ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const errorObj =
        this.state.error ?? new Error(this.props.fallbackTitle || 'Unexpected client error');
      return (
        <ErrorFallbackView
          error={errorObj}
          reset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
