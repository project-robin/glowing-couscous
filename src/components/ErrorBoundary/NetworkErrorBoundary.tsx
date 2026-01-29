/**
 * Network Error Boundary
 *
 * React error boundary for handling network degradation scenarios:
 * - Detects network errors (offline, timeout, connection issues)
 * - Shows user-friendly error messages
 * - Provides retry functionality
 * - Graceful degradation to offline mode
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface NetworkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: NetworkError, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

export interface NetworkErrorBoundaryState {
  hasError: boolean;
  error: NetworkError | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
  retryCount: number;
  isRetrying: boolean;
  lastOnlineTime: number | null;
}

export interface NetworkError extends Error {
  type: 'offline' | 'timeout' | 'connection' | 'dns' | 'unknown';
  statusCode?: number;
  isRecoverable: boolean;
}

// ============================================================================
// Network Error Detection
// ============================================================================

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  if (!(error instanceof Error)) return false;

  const networkErrorPatterns = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'offline',
    'internet',
    'econnrefused',
    'enotfound',
    'etimedout',
    'abort',
  ];

  const errorMessage = error.message.toLowerCase();
  return networkErrorPatterns.some((pattern) => errorMessage.includes(pattern));
}

/**
 * Classify network error type
 */
export function classifyNetworkError(error: Error): NetworkError['type'] {
  const message = error.message.toLowerCase();

  if (message.includes('offline') || message.includes('internet')) {
    return 'offline';
  }
  if (message.includes('timeout') || message.includes('etimedout')) {
    return 'timeout';
  }
  if (message.includes('dns') || message.includes('enotfound')) {
    return 'dns';
  }
  if (
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('network')
  ) {
    return 'connection';
  }

  return 'unknown';
}

/**
 * Create a NetworkError from a regular Error
 */
export function createNetworkError(error: Error): NetworkError {
  const type = classifyNetworkError(error);
  const isRecoverable = type !== 'dns' && type !== 'unknown';

  const networkError = new Error(error.message) as NetworkError;
  networkError.name = 'NetworkError';
  networkError.type = type;
  networkError.isRecoverable = isRecoverable;
  networkError.stack = error.stack;

  return networkError;
}

// ============================================================================
// Default Fallback UI
// ============================================================================

interface DefaultFallbackProps {
  error: NetworkError;
  isOffline: boolean;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
  onRetry: () => void;
  onGoOffline: () => void;
}

const DefaultFallback: React.FC<DefaultFallbackProps> = ({
  error,
  isOffline,
  retryCount,
  maxRetries,
  isRetrying,
  onRetry,
  onGoOffline,
}) => {
  const getErrorMessage = () => {
    switch (error.type) {
      case 'offline':
        return 'You appear to be offline. Please check your internet connection.';
      case 'timeout':
        return 'The request timed out. The server may be slow or unreachable.';
      case 'connection':
        return 'Unable to connect to the server. Please try again later.';
      case 'dns':
        return 'Unable to resolve the server address. Please check your network settings.';
      default:
        return 'A network error occurred. Please check your connection and try again.';
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'offline':
        return '📡';
      case 'timeout':
        return '⏱️';
      case 'connection':
        return '🔌';
      case 'dns':
        return '🔍';
      default:
        return '🌐';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}
      >
        {getErrorIcon()}
      </div>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}
      >
        {isOffline ? 'You are offline' : 'Network Error'}
      </h1>

      <p
        style={{
          fontSize: '1rem',
          color: '#666',
          textAlign: 'center',
          maxWidth: '400px',
          marginBottom: '1.5rem',
          lineHeight: 1.5,
        }}
      >
        {getErrorMessage()}
      </p>

      {retryCount > 0 && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#888',
            marginBottom: '1rem',
          }}
        >
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onRetry}
          disabled={isRetrying || retryCount >= maxRetries}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isRetrying || retryCount >= maxRetries ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: isRetrying || retryCount >= maxRetries ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isRetrying ? 'Retrying...' : retryCount >= maxRetries ? 'Max retries reached' : 'Try Again'}
        </button>

        <button
          onClick={onGoOffline}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          Continue Offline
        </button>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          color: '#666',
          maxWidth: '400px',
          wordBreak: 'break-word',
        }}
      >
        <strong>Error details:</strong>
        <br />
        Type: {error.type}
        <br />
        Message: {error.message}
        {error.isRecoverable && <br />}
        {error.isRecoverable && 'This error may be temporary.'}
      </div>
    </div>
  );
};

// ============================================================================
// Network Error Boundary Component
// ============================================================================

export class NetworkErrorBoundary extends Component<
  NetworkErrorBoundaryProps,
  NetworkErrorBoundaryState
> {
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(props: NetworkErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: !navigator.onLine,
      retryCount: 0,
      isRetrying: false,
      lastOnlineTime: navigator.onLine ? Date.now() : null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NetworkErrorBoundaryState> {
    if (isNetworkError(error)) {
      return {
        hasError: true,
        error: createNetworkError(error),
      };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isNetworkError(error)) {
      const networkError = createNetworkError(error);

      this.setState({
        error: networkError,
        errorInfo,
      });

      // Log error for debugging
      console.error('[NetworkErrorBoundary] Network error caught:', {
        error: networkError,
        errorInfo,
        timestamp: new Date().toISOString(),
      });

      // Call error handler if provided
      this.props.onError?.(networkError, errorInfo);
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    this.onlineListener = () => {
      this.setState({
        isOffline: false,
        lastOnlineTime: Date.now(),
      });

      // Auto-retry when coming back online
      if (this.state.hasError && this.state.error?.isRecoverable) {
        this.handleRetry();
      }
    };

    this.offlineListener = () => {
      this.setState({ isOffline: true });
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  componentWillUnmount() {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }
  }

  handleRetry = async () => {
    const { maxRetries = 3, retryDelay = 2000, onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    // Reset error state to trigger re-render
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
      isRetrying: false,
    });

    onRetry?.();
  };

  handleGoOffline = () => {
    // Enable offline mode - this could set a global state
    // For now, we just reset the error and let the app handle offline mode
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Dispatch custom event for offline mode
    window.dispatchEvent(new CustomEvent('app:offline-mode'));
  };

  render() {
    const { children, fallback, maxRetries = 3 } = this.props;
    const { hasError, error, isOffline, retryCount, isRetrying } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Use default fallback UI
      return (
        <DefaultFallback
          error={error}
          isOffline={isOffline}
          retryCount={retryCount}
          maxRetries={maxRetries}
          isRetrying={isRetrying}
          onRetry={this.handleRetry}
          onGoOffline={this.handleGoOffline}
        />
      );
    }

    return <>{children}</>;
  }
}

// ============================================================================
// Hook for Network Status
// ============================================================================

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: number | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnlineTime: navigator.onLine ? Date.now() : null,
    connectionType: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        isOffline: false,
        lastOnlineTime: Date.now(),
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        isOffline: true,
      }));
    };

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setStatus((prev) => ({
          ...prev,
          connectionType: connection.type || null,
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null,
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return status;
}

// ============================================================================
// Higher-Order Component
// ============================================================================

export function withNetworkErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<NetworkErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WithNetworkErrorBoundary(props: P) {
    return (
      <NetworkErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </NetworkErrorBoundary>
    );
  };
}

export default NetworkErrorBoundary;
