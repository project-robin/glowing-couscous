/**
 * API Error Boundary
 *
 * React error boundary for handling API errors:
 * - Handles 4xx and 5xx HTTP errors
 * - Shows appropriate error messages based on status code
 * - Provides retry with exponential backoff
 * - Logs errors for debugging
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: ApiError, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  shouldHandleError?: (error: ApiError) => boolean;
}

export interface ApiErrorBoundaryState {
  hasError: boolean;
  error: ApiError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  nextRetryDelay: number;
}

export interface ApiError extends Error {
  statusCode: number;
  statusText?: string;
  endpoint?: string;
  responseData?: unknown;
  isRetryable: boolean;
  retryAfter?: number;
}

// ============================================================================
// API Error Classification
// ============================================================================

/**
 * HTTP Status Code Categories
 */
export const HttpStatus = {
  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number'
  );
}

/**
 * Check if an HTTP status code is retryable
 */
export function isRetryableStatusCode(statusCode: number): boolean {
  // Retry on specific 5xx errors and 429 (rate limit)
  const retryableCodes = [
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
  ];

  return retryableCodes.includes(statusCode as any);
}

/**
 * Check if an HTTP status code is a client error (4xx)
 */
export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Check if an HTTP status code is a server error (5xx)
 */
export function isServerError(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

/**
 * Create an ApiError from a Response object
 */
export async function createApiErrorFromResponse(
  response: Response,
  endpoint?: string
): Promise<ApiError> {
  let responseData: unknown;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }

  const error = new Error(
    (responseData as any)?.message || response.statusText || 'API Error'
  ) as ApiError;

  error.name = 'ApiError';
  error.statusCode = response.status;
  error.statusText = response.statusText;
  error.endpoint = endpoint;
  error.responseData = responseData;
  error.isRetryable = isRetryableStatusCode(response.status);

  // Check for Retry-After header
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    error.retryAfter = parseInt(retryAfter, 10) * 1000;
  }

  return error;
}

/**
 * Get user-friendly error message based on status code
 */
export function getErrorMessageForStatusCode(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return 'The request was invalid. Please check your input and try again.';
    case HttpStatus.UNAUTHORIZED:
      return 'Your session has expired. Please sign in again.';
    case HttpStatus.FORBIDDEN:
      return "You don't have permission to perform this action.";
    case HttpStatus.NOT_FOUND:
      return 'The requested resource was not found.';
    case HttpStatus.METHOD_NOT_ALLOWED:
      return 'This action is not supported.';
    case HttpStatus.CONFLICT:
      return 'There was a conflict with the current state. Please try again.';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'The request could not be processed. Please check your input.';
    case HttpStatus.TOO_MANY_REQUESTS:
      return "You've made too many requests. Please wait a moment and try again.";
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return 'An internal server error occurred. Please try again later.';
    case HttpStatus.BAD_GATEWAY:
      return 'The server is temporarily unavailable. Please try again later.';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'The service is temporarily unavailable. Please try again later.';
    case HttpStatus.GATEWAY_TIMEOUT:
      return 'The request timed out. Please try again later.';
    default:
      if (isClientError(statusCode)) {
        return 'A client error occurred. Please check your request and try again.';
      }
      if (isServerError(statusCode)) {
        return 'A server error occurred. Please try again later.';
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get error severity based on status code
 */
export function getErrorSeverity(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
  if (statusCode === HttpStatus.TOO_MANY_REQUESTS) return 'low';
  if (isClientError(statusCode)) return 'medium';
  if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) return 'high';
  if (isServerError(statusCode)) return 'critical';
  return 'medium';
}

// ============================================================================
// Default Fallback UI
// ============================================================================

interface DefaultFallbackProps {
  error: ApiError;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
  nextRetryDelay: number;
  onRetry: () => void;
  onDismiss: () => void;
}

const DefaultFallback: React.FC<DefaultFallbackProps> = ({
  error,
  retryCount,
  maxRetries,
  isRetrying,
  nextRetryDelay,
  onRetry,
  onDismiss,
}) => {
  const severity = getErrorSeverity(error.statusCode);
  const canRetry = error.isRetryable && retryCount < maxRetries;

  const getSeverityColor = () => {
    switch (severity) {
      case 'low':
        return '#ffc107';
      case 'medium':
        return '#fd7e14';
      case 'high':
        return '#dc3545';
      case 'critical':
        return '#721c24';
      default:
        return '#6c757d';
    }
  };

  const getErrorIcon = () => {
    if (isClientError(error.statusCode)) return '⚠️';
    if (isServerError(error.statusCode)) return '🔥';
    return '❌';
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

      <div
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: getSeverityColor(),
          color: severity === 'critical' ? '#fff' : '#000',
          borderRadius: '0.25rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        {severity} Error
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
        Error {error.statusCode}
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
        {getErrorMessageForStatusCode(error.statusCode)}
      </p>

      {error.endpoint && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#888',
            marginBottom: '1rem',
          }}
        >
          Endpoint: <code>{error.endpoint}</code>
        </p>
      )}

      {retryCount > 0 && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#888',
            marginBottom: '0.5rem',
          }}
        >
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      {canRetry && nextRetryDelay > 0 && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#888',
            marginBottom: '1rem',
          }}
        >
          Next retry in {Math.ceil(nextRetryDelay / 1000)}s
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
        {canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isRetrying ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        )}

        <button
          onClick={onDismiss}
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
          Dismiss
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
          textAlign: 'left',
        }}
      >
        <strong>Error Details:</strong>
        <br />
        Status: {error.statusCode} {error.statusText}
        <br />
        Message: {error.message}
        {error.endpoint && (
          <>
            <br />
            Endpoint: {error.endpoint}
          </>
        )}
        {error.isRetryable && (
          <>
            <br />
            <span style={{ color: '#28a745' }}>This error is retryable</span>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// API Error Boundary Component
// ============================================================================

export class ApiErrorBoundary extends Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ApiErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      nextRetryDelay: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ApiErrorBoundaryState> {
    if (isApiError(error)) {
      return {
        hasError: true,
        error,
      };
    }
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isApiError(error)) {
      this.setState({
        error,
        errorInfo,
      });

      // Log error for debugging
      this.logError(error, errorInfo);

      // Call error handler if provided
      this.props.onError?.(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private logError(error: ApiError, errorInfo: ErrorInfo) {
    const errorLog = {
      type: 'API_ERROR',
      statusCode: error.statusCode,
      statusText: error.statusText,
      endpoint: error.endpoint,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      severity: getErrorSeverity(error.statusCode),
    };

    // Log to console
    console.error('[ApiErrorBoundary] API error caught:', errorLog);

    // In production, you might send to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorLog });
  }

  private calculateRetryDelay(): number {
    const { baseRetryDelay = 1000, maxRetryDelay = 30000 } = this.props;
    const { retryCount, error } = this.state;

    // Use Retry-After header if available
    if (error?.retryAfter) {
      return error.retryAfter;
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseRetryDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, maxRetryDelay);
  }

  handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props;
    const { retryCount, error } = this.state;

    if (!error?.isRetryable || retryCount >= maxRetries) {
      return;
    }

    const delay = this.calculateRetryDelay();
    this.setState({
      isRetrying: true,
      nextRetryDelay: delay,
    });

    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRetrying: false,
        nextRetryDelay: 0,
      });

      onRetry?.();
    }, delay);
  };

  handleDismiss = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      nextRetryDelay: 0,
    });
  };

  render() {
    const { children, fallback, maxRetries = 3 } = this.props;
    const { hasError, error, retryCount, isRetrying, nextRetryDelay } = this.state;

    if (hasError && error) {
      // Check if custom error handler wants to skip this error
      if (this.props.shouldHandleError && !this.props.shouldHandleError(error)) {
        return <>{children}</>;
      }

      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Use default fallback UI
      return (
        <DefaultFallback
          error={error}
          retryCount={retryCount}
          maxRetries={maxRetries}
          isRetrying={isRetrying}
          nextRetryDelay={nextRetryDelay}
          onRetry={this.handleRetry}
          onDismiss={this.handleDismiss}
        />
      );
    }

    return <>{children}</>;
  }
}

// ============================================================================
// Hook for API Error Handling
// ============================================================================

import { useState, useCallback } from 'react';

export interface UseApiErrorHandlerResult {
  error: ApiError | null;
  retryCount: number;
  isRetrying: boolean;
  handleError: (error: ApiError) => void;
  handleRetry: () => void;
  handleDismiss: () => void;
  reset: () => void;
}

export function useApiErrorHandler(
  maxRetries: number = 3,
  onRetry?: () => void
): UseApiErrorHandlerResult {
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err: ApiError) => {
    setError(err);
  }, []);

  const handleRetry = useCallback(() => {
    if (!error?.isRetryable || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);

    const delay = 1000 * Math.pow(2, retryCount);

    setTimeout(() => {
      setError(null);
      setRetryCount((prev) => prev + 1);
      setIsRetrying(false);
      onRetry?.();
    }, delay);
  }, [error, retryCount, maxRetries, onRetry]);

  const handleDismiss = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    error,
    retryCount,
    isRetrying,
    handleError,
    handleRetry,
    handleDismiss,
    reset,
  };
}

// ============================================================================
// Higher-Order Component
// ============================================================================

export function withApiErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<ApiErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WithApiErrorBoundary(props: P) {
    return (
      <ApiErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </ApiErrorBoundary>
    );
  };
}

export default ApiErrorBoundary;
