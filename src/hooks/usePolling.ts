/**
 * usePolling Hook - Polling Fallback Hook
 * 
 * Fallback polling hook when SSE is not available.
 * Used for job status checking (onboarding completion).
 * 
 * Features:
 * - Configurable poll interval
 * - Automatic stop on success/error
 * - Exponential backoff for errors
 * - Cleanup on unmount
 * - No WebSocket dependencies
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PollingOptions<T> {
  /** Function to call on each poll */
  pollFn: () => Promise<T>;
  /** Function to determine if polling should stop based on result */
  stopWhen: (result: T) => boolean;
  /** Function to determine if result indicates an error */
  isError?: (result: T) => boolean;
  /** Poll interval in milliseconds (default: 3000) */
  interval?: number;
  /** Maximum number of polls (default: Infinity) */
  maxPolls?: number;
  /** Initial delay before first poll in ms (default: 0) */
  initialDelay?: number;
  /** Callback when polling completes successfully */
  onSuccess?: (result: T) => void;
  /** Callback when polling encounters an error */
  onError?: (error: PollingError) => void;
  /** Callback on each poll (for progress tracking) */
  onPoll?: (result: T, pollCount: number) => void;
  /** Enable exponential backoff on errors (default: true) */
  backoffOnError?: boolean;
  /** Maximum backoff delay in ms (default: 30000) */
  maxBackoffDelay?: number;
}

export interface PollingState<T> {
  /** Current polling status */
  status: 'idle' | 'polling' | 'success' | 'error' | 'stopped';
  /** Last result received */
  data: T | null;
  /** Current error if any */
  error: PollingError | null;
  /** Number of polls completed */
  pollCount: number;
  /** Whether currently polling */
  isPolling: boolean;
  /** Time of last poll */
  lastPollTime: number | null;
  /** Next poll time (for UI countdown) */
  nextPollTime: number | null;
}

export interface PollingError {
  code: string;
  message: string;
  pollCount: number;
}

export interface PollingReturn<T> {
  /** Current polling state */
  state: PollingState<T>;
  /** Start polling */
  start: () => void;
  /** Stop polling */
  stop: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Manually trigger a poll */
  poll: () => Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_INTERVAL = 3000; // 3 seconds
const DEFAULT_MAX_POLLS = Infinity;
const DEFAULT_INITIAL_DELAY = 0;
const DEFAULT_MAX_BACKOFF_DELAY = 30000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for polling with automatic stop conditions
 * 
 * @example
 * ```tsx
 * // Poll for job completion
 * const { state, start, stop } = usePolling({
 *   pollFn: async () => {
 *     const response = await fetch(`/api/jobs/status?jobId=${jobId}`);
 *     return response.json();
 *   },
 *   stopWhen: (result) => result.status === 'completed' || result.status === 'failed',
 *   onSuccess: (result) => console.log('Job done:', result),
 *   onError: (error) => console.error('Polling failed:', error),
 *   interval: 2000,
 *   maxPolls: 60, // Stop after 60 attempts (2 minutes at 2s interval)
 * });
 * 
 * useEffect(() => {
 *   start();
 *   return () => stop();
 * }, []);
 * ```
 */
export function usePolling<T>(options: PollingOptions<T>): PollingReturn<T> {
  const {
    pollFn,
    stopWhen,
    isError,
    interval = DEFAULT_INTERVAL,
    maxPolls = DEFAULT_MAX_POLLS,
    initialDelay = DEFAULT_INITIAL_DELAY,
    onSuccess,
    onError,
    onPoll,
    backoffOnError = true,
    maxBackoffDelay = DEFAULT_MAX_BACKOFF_DELAY,
  } = options;

  // State
  const [state, setState] = useState<PollingState<T>>({
    status: 'idle',
    data: null,
    error: null,
    pollCount: 0,
    isPolling: false,
    lastPollTime: null,
    nextPollTime: null,
  });

  // Refs for managing polling lifecycle
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const isPollingRef = useRef(false);
  const currentIntervalRef = useRef(interval);
  const consecutiveErrorsRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    cleanup();
    pollCountRef.current = 0;
    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = interval;
    setState({
      status: 'idle',
      data: null,
      error: null,
      pollCount: 0,
      isPolling: false,
      lastPollTime: null,
      nextPollTime: null,
    });
  }, [cleanup, interval]);

  // Stop function
  const stop = useCallback(() => {
    cleanup();
    setState((prev) => ({
      ...prev,
      status: prev.status === 'polling' ? 'stopped' : prev.status,
      isPolling: false,
      nextPollTime: null,
    }));
  }, [cleanup]);

  // Execute a single poll
  const executePoll = useCallback(async (): Promise<boolean> => {
    try {
      const result = await pollFn();
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = interval; // Reset interval on success

      pollCountRef.current += 1;
      const currentPollCount = pollCountRef.current;

      setState((prev) => ({
        ...prev,
        data: result,
        pollCount: currentPollCount,
        lastPollTime: Date.now(),
        error: null,
      }));

      onPoll?.(result, currentPollCount);

      // Check if we should stop
      if (stopWhen(result)) {
        // Check if result is an error state
        if (isError?.(result)) {
          const error: PollingError = {
            code: 'POLL_RESULT_ERROR',
            message: 'Polling stopped due to error result',
            pollCount: currentPollCount,
          };
          setState((prev) => ({
            ...prev,
            status: 'error',
            isPolling: false,
            error,
          }));
          onError?.(error);
        } else {
          setState((prev) => ({
            ...prev,
            status: 'success',
            isPolling: false,
          }));
          onSuccess?.(result);
        }
        return true; // Stop polling
      }

      // Check max polls
      if (currentPollCount >= maxPolls) {
        const error: PollingError = {
          code: 'MAX_POLLS_EXCEEDED',
          message: `Maximum number of polls (${maxPolls}) exceeded`,
          pollCount: currentPollCount,
        };
        setState((prev) => ({
          ...prev,
          status: 'error',
          isPolling: false,
          error,
        }));
        onError?.(error);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      consecutiveErrorsRef.current += 1;
      const currentPollCount = pollCountRef.current;

      // Calculate backoff
      if (backoffOnError) {
        const backoffDelay = Math.min(
          interval * Math.pow(2, consecutiveErrorsRef.current - 1),
          maxBackoffDelay
        );
        currentIntervalRef.current = backoffDelay;
      }

      const error: PollingError = {
        code: 'POLL_ERROR',
        message: err instanceof Error ? err.message : 'Poll failed',
        pollCount: currentPollCount,
      };

      setState((prev) => ({
        ...prev,
        status: 'error',
        error,
        isPolling: false,
      }));

      onError?.(error);
      return true; // Stop polling on error
    }
  }, [
    pollFn,
    stopWhen,
    isError,
    interval,
    maxPolls,
    backoffOnError,
    maxBackoffDelay,
    onSuccess,
    onError,
    onPoll,
  ]);

  // Schedule next poll
  const scheduleNextPoll = useCallback(() => {
    if (!isPollingRef.current) return;

    const nextPollTime = Date.now() + currentIntervalRef.current;
    setState((prev) => ({
      ...prev,
      nextPollTime,
    }));

    timeoutRef.current = setTimeout(async () => {
      if (!isPollingRef.current) return;

      const shouldStop = await executePoll();
      if (!shouldStop && isPollingRef.current) {
        scheduleNextPoll();
      }
    }, currentIntervalRef.current);
  }, [executePoll]);

  // Start polling
  const start = useCallback(() => {
    // Prevent multiple starts
    if (isPollingRef.current) return;

    isPollingRef.current = true;
    pollCountRef.current = 0;
    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = interval;

    setState((prev) => ({
      ...prev,
      status: 'polling',
      isPolling: true,
      error: null,
    }));

    // Initial delay before first poll
    if (initialDelay > 0) {
      setState((prev) => ({
        ...prev,
        nextPollTime: Date.now() + initialDelay,
      }));

      timeoutRef.current = setTimeout(() => {
        executePoll().then((shouldStop) => {
          if (!shouldStop && isPollingRef.current) {
            scheduleNextPoll();
          }
        });
      }, initialDelay);
    } else {
      // Start immediately
      executePoll().then((shouldStop) => {
        if (!shouldStop && isPollingRef.current) {
          scheduleNextPoll();
        }
      });
    }
  }, [initialDelay, interval, executePoll, scheduleNextPoll]);

  // Manual poll function
  const poll = useCallback(async () => {
    await executePoll();
  }, [executePoll]);

  return {
    state,
    start,
    stop,
    reset,
    poll,
  };
}

// ============================================================================
// Specialized Hook for Job Status Polling
// ============================================================================

export interface JobStatusPollingOptions {
  /** Function to fetch job status */
  fetchJobStatus: () => Promise<JobStatusResult>;
  /** Callback when job completes successfully */
  onComplete?: (result: JobStatusResult) => void;
  /** Callback when job fails */
  onFail?: (result: JobStatusResult) => void;
  /** Callback on error */
  onError?: (error: PollingError) => void;
  /** Poll interval in ms (default: 3000) */
  interval?: number;
  /** Maximum polls before giving up (default: 60) */
  maxPolls?: number;
}

export interface JobStatusResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
}

/**
 * Specialized hook for polling job status
 * 
 * @example
 * ```tsx
 * const { state, start } = useJobStatusPolling({
 *   fetchJobStatus: async () => {
 *     const res = await fetch(`/api/jobs/status?jobId=${jobId}`);
 *     return res.json();
 *   },
 *   onComplete: (result) => console.log('Job done!'),
 *   onFail: (result) => console.error('Job failed:', result.error),
 *   interval: 2000,
 * });
 * ```
 */
export function useJobStatusPolling(options: JobStatusPollingOptions) {
  const { fetchJobStatus, onComplete, onFail, onError, interval, maxPolls } = options;

  const stopWhen = useCallback(
    (result: JobStatusResult) =>
      result.status === 'completed' || result.status === 'failed',
    []
  );

  const isError = useCallback(
    (result: JobStatusResult) => result.status === 'failed',
    []
  );

  const handleSuccess = useCallback(
    (result: JobStatusResult) => {
      if (result.status === 'completed') {
        onComplete?.(result);
      } else if (result.status === 'failed') {
        onFail?.(result);
      }
    },
    [onComplete, onFail]
  );

  const { state, start, stop, reset, poll } = usePolling<JobStatusResult>({
    pollFn: fetchJobStatus,
    stopWhen,
    isError,
    interval: interval ?? 3000,
    maxPolls: maxPolls ?? 60,
    onSuccess: handleSuccess,
    onError,
    backoffOnError: true,
  });

  return {
    state,
    start,
    stop,
    reset,
    poll,
    // Convenience getters
    isPending: state.data?.status === 'pending',
    isProcessing: state.data?.status === 'processing',
    isCompleted: state.data?.status === 'completed',
    isFailed: state.data?.status === 'failed',
    progress: state.data?.progress ?? 0,
  };
}

// ============================================================================
// Utility Hook for Onboarding Status
// ============================================================================

export interface OnboardingStatus {
  status: 'processing' | 'completed' | 'failed';
  failureReason?: string;
  astroProfile?: {
    astroSummary?: string;
  };
}

export interface UseOnboardingPollingOptions {
  /** Function to check onboarding status */
  checkStatus: () => Promise<OnboardingStatus>;
  /** Callback when onboarding completes */
  onComplete?: (status: OnboardingStatus) => void;
  /** Callback when onboarding fails */
  onFail?: (status: OnboardingStatus) => void;
  /** Callback on error */
  onError?: (error: PollingError) => void;
  /** Poll interval in ms (default: 5000) */
  interval?: number;
  /** Maximum polls (default: 60 = 5 minutes at 5s interval) */
  maxPolls?: number;
}

/**
 * Hook specifically for polling onboarding completion status
 * 
 * @example
 * ```tsx
 * const { state, start, progress } = useOnboardingPolling({
 *   checkStatus: async () => {
 *     const res = await api.getProfile();
 *     return res.data!;
 *   },
 *   onComplete: (status) => router.push('/chat'),
 *   onFail: (status) => toast.error(status.failureReason),
 * });
 * ```
 */
export function useOnboardingPolling(options: UseOnboardingPollingOptions) {
  const { checkStatus, onComplete, onFail, onError, interval, maxPolls } = options;

  const stopWhen = useCallback(
    (result: OnboardingStatus) =>
      result.status === 'completed' || result.status === 'failed',
    []
  );

  const isError = useCallback(
    (result: OnboardingStatus) => result.status === 'failed',
    []
  );

  const handleSuccess = useCallback(
    (result: OnboardingStatus) => {
      if (result.status === 'completed') {
        onComplete?.(result);
      } else if (result.status === 'failed') {
        onFail?.(result);
      }
    },
    [onComplete, onFail]
  );

  const { state, start, stop, reset, poll } = usePolling<OnboardingStatus>({
    pollFn: checkStatus,
    stopWhen,
    isError,
    interval: interval ?? 5000,
    maxPolls: maxPolls ?? 60,
    initialDelay: 1000, // Small delay before first check
    onSuccess: handleSuccess,
    onError,
    backoffOnError: true,
  });

  // Calculate estimated progress based on poll count
  // (since we don't have real progress from the backend)
  const estimatedProgress = Math.min(
    ((state.pollCount * (interval ?? 5000)) / 120000) * 100, // Estimate 2 min total
    95 // Cap at 95% until actually complete
  );

  return {
    state,
    start,
    stop,
    reset,
    poll,
    // Convenience getters
    isProcessing: state.data?.status === 'processing',
    isCompleted: state.data?.status === 'completed',
    isFailed: state.data?.status === 'failed',
    progress: state.data?.status === 'completed' ? 100 : estimatedProgress,
    failureReason: state.data?.failureReason,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default usePolling;
