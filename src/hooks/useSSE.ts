/**
 * useSSE Hook - Server-Sent Events Streaming Hook
 * 
 * React hook for SSE streaming with proper connection lifecycle management.
 * Handles connect, disconnect, reconnect with exponential backoff.
 * 
 * Features:
 * - Parse SSE events properly
 * - Error handling with exponential backoff
 * - AbortController support for cleanup
 * - No WebSocket dependencies
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SSEOptions {
  /** URL to connect to for SSE stream */
  url: string;
  /** HTTP method (default: POST) */
  method?: 'GET' | 'POST';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST requests) */
  body?: unknown;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback for each message chunk */
  onMessage: (chunk: string) => void;
  /** Callback when stream completes */
  onComplete?: (fullText: string) => void;
  /** Callback for errors */
  onError?: (error: SSEError) => void;
  /** Initial retry delay in ms (default: 1000) */
  initialRetryDelay?: number;
  /** Maximum retry delay in ms (default: 30000) */
  maxRetryDelay?: number;
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Request timeout in ms (default: 60000) */
  timeout?: number;
}

export interface SSEState {
  /** Current connection status */
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error';
  /** Accumulated text from the stream */
  text: string;
  /** Current error if any */
  error: SSEError | null;
  /** Number of reconnection attempts made */
  retryCount: number;
  /** Whether the connection is currently active */
  isConnected: boolean;
}

export interface SSEError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface SSEReturn {
  /** Current state of the SSE connection */
  state: SSEState;
  /** Start the SSE connection */
  connect: () => void;
  /** Disconnect the SSE connection */
  disconnect: () => void;
  /** Reset the state to idle */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_INITIAL_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRY_DELAY = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 60000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for Server-Sent Events (SSE) streaming
 * 
 * @example
 * ```tsx
 * const { state, connect, disconnect } = useSSE({
 *   url: '/api/chat/stream',
 *   method: 'POST',
 *   body: { message: 'Hello' },
 *   headers: { Authorization: 'Bearer token' },
 *   onMessage: (chunk) => console.log(chunk),
 *   onComplete: (text) => console.log('Done:', text),
 * });
 * 
 * // Start connection
 * useEffect(() => {
 *   connect();
 *   return () => disconnect();
 * }, []);
 * ```
 */
export function useSSE(options: SSEOptions): SSEReturn {
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    onOpen,
    onMessage,
    onComplete,
    onError,
    initialRetryDelay = DEFAULT_INITIAL_RETRY_DELAY,
    maxRetryDelay = DEFAULT_MAX_RETRY_DELAY,
    maxRetries = DEFAULT_MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  // State
  const [state, setState] = useState<SSEState>({
    status: 'idle',
    text: '',
    error: null,
    retryCount: 0,
    isConnected: false,
  });

  // Refs for managing connection lifecycle
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const fullTextRef = useRef('');
  const isConnectingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Abort any active request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    isConnectingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      isConnected: false,
    }));
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    cleanup();
    retryCountRef.current = 0;
    fullTextRef.current = '';
    setState({
      status: 'idle',
      text: '',
      error: null,
      retryCount: 0,
      isConnected: false,
    });
  }, [cleanup]);

  // Calculate retry delay with exponential backoff
  const getRetryDelay = useCallback((): number => {
    const delay = initialRetryDelay * Math.pow(2, retryCountRef.current);
    return Math.min(delay, maxRetryDelay);
  }, [initialRetryDelay, maxRetryDelay]);

  // Handle retry logic
  const scheduleRetry = useCallback(
    (error: SSEError) => {
      if (retryCountRef.current < maxRetries && error.retryable) {
        const delay = getRetryDelay();
        retryCountRef.current += 1;

        setState((prev) => ({
          ...prev,
          status: 'connecting',
          error,
          retryCount: retryCountRef.current,
        }));

        retryTimeoutRef.current = setTimeout(() => {
          connectInternal();
        }, delay);
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error,
          isConnected: false,
        }));
        onError?.(error);
      }
    },
    [maxRetries, getRetryDelay, onError]
  );

  // Internal connect function
  const connectInternal = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    // Cleanup any existing connection
    cleanup();

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      status: 'connecting',
      error: null,
    }));

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...headers,
        },
        signal: abortControllerRef.current.signal,
      };

      if (method === 'POST' && body) {
        fetchOptions.body = JSON.stringify(body);
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, timeout);

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = 'HTTP_ERROR';

        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
          errorCode = errorData.error?.code || errorCode;
        } catch {
          // Not JSON response
        }

        const error: SSEError = {
          code: errorCode,
          message: errorMessage,
          retryable: response.status >= 500 || response.status === 429,
        };

        scheduleRetry(error);
        return;
      }

      if (!response.body) {
        const error: SSEError = {
          code: 'NO_BODY',
          message: 'Response body is null',
          retryable: true,
        };
        scheduleRetry(error);
        return;
      }

      // Connection successful
      setState((prev) => ({
        ...prev,
        status: 'streaming',
        isConnected: true,
        retryCount: retryCountRef.current,
      }));

      onOpen?.();

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              processSSEChunk(buffer, (chunk) => {
                fullTextRef.current += chunk;
                onMessage(chunk);
              });
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            processSSEChunk(line, (chunk) => {
              fullTextRef.current += chunk;
              onMessage(chunk);
            });
          }
        }

        // Stream completed successfully
        setState((prev) => ({
          ...prev,
          status: 'completed',
          text: fullTextRef.current,
          isConnected: false,
        }));

        onComplete?.(fullTextRef.current);
      } catch (readError) {
        // Handle read errors
        if (readError instanceof Error && readError.name === 'AbortError') {
          // Aborted by user or timeout
          setState((prev) => ({
            ...prev,
            status: 'idle',
            isConnected: false,
          }));
        } else {
          const error: SSEError = {
            code: 'READ_ERROR',
            message: readError instanceof Error ? readError.message : 'Failed to read stream',
            retryable: true,
          };
          scheduleRetry(error);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        // Aborted by user
        setState((prev) => ({
          ...prev,
          status: 'idle',
          isConnected: false,
        }));
      } else {
        const error: SSEError = {
          code: 'FETCH_ERROR',
          message: fetchError instanceof Error ? fetchError.message : 'Failed to connect',
          retryable: true,
        };
        scheduleRetry(error);
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [url, method, headers, body, timeout, onOpen, onMessage, onComplete, cleanup, scheduleRetry]);

  // Public connect function
  const connect = useCallback(() => {
    // Reset retry count on manual connect
    retryCountRef.current = 0;
    fullTextRef.current = '';
    connectInternal();
  }, [connectInternal]);

  return {
    state,
    connect,
    disconnect,
    reset,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Process a single SSE line and extract the data
 */
function processSSEChunk(line: string, onChunk: (chunk: string) => void): void {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith(':')) {
    return;
  }

  // Handle data: prefix
  if (trimmed.startsWith('data: ')) {
    const data = trimmed.slice(6); // Remove 'data: ' prefix

    // Check for end marker
    if (data === '[DONE]') {
      return;
    }

    try {
      // Try to parse as JSON (OpenAI-style streaming)
      const parsed = JSON.parse(data);

      // Handle different SSE formats
      if (parsed.choices?.[0]?.delta?.content) {
        // OpenAI format
        onChunk(parsed.choices[0].delta.content);
      } else if (parsed.choices?.[0]?.text) {
        // Alternative OpenAI format
        onChunk(parsed.choices[0].text);
      } else if (parsed.content) {
        // Simple content field
        onChunk(parsed.content);
      } else if (parsed.delta) {
        // Generic delta format
        onChunk(typeof parsed.delta === 'string' ? parsed.delta : JSON.stringify(parsed.delta));
      } else {
        // Unknown format, send raw data
        onChunk(data);
      }
    } catch {
      // Not valid JSON, treat as raw text
      onChunk(data);
    }
  }
}

// ============================================================================
// Utility Hook for Chat Streaming
// ============================================================================

export interface UseChatStreamOptions {
  /** API endpoint URL */
  apiUrl: string;
  /** Auth token */
  token?: string;
  /** Callback when a message chunk is received */
  onMessage?: (chunk: string) => void;
  /** Callback when streaming completes */
  onComplete?: (fullText: string) => void;
  /** Callback on error */
  onError?: (error: SSEError) => void;
}

/**
 * Simplified hook for chat streaming use case
 */
export function useChatStream(options: UseChatStreamOptions) {
  const { apiUrl, token, onMessage, onComplete, onError } = options;

  const streamChat = useCallback(
    async (message: string, sessionId?: string) => {
      const abortController = new AbortController();

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, sessionId }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            processSSEChunk(line, (chunk) => {
              fullText += chunk;
              onMessage?.(chunk);
            });
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          processSSEChunk(buffer, (chunk) => {
            fullText += chunk;
            onMessage?.(chunk);
          });
        }

        onComplete?.(fullText);
        return fullText;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return null;
        }
        const sseError: SSEError = {
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Stream failed',
          retryable: true,
        };
        onError?.(sseError);
        throw error;
      }
    },
    [apiUrl, token, onMessage, onComplete, onError]
  );

  return { streamChat };
}

// ============================================================================
// Default Export
// ============================================================================

export default useSSE;
