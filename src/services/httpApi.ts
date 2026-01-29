/**
 * HTTP API Client - Production-Ready Implementation
 * 
 * HTTP-only API client with no WebSocket dependencies.
 * Supports SSE streaming with proper error handling.
 * 
 * Key Design Principles:
 * 1. No WebSocket code anywhere
 * 2. Token-based authentication with Clerk JWT
 * 3. Proper TypeScript types for all requests/responses
 * 4. Production-ready error handling
 * 5. SSE streaming for chat responses
 */

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_ASTRO_API_URL || 'http://localhost:3000/api/v1';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface OnboardingData {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string; // HH:MM
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface OnboardingResult {
  uid: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  status: 'processing' | 'completed' | 'failed';
  failureReason?: string;
  astroProfile?: {
    astroSummary?: string;
  };
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResult {
  response: string;
  sessionId: string;
}

export interface StreamChatOptions {
  onMessage?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: ApiError) => void;
  onStart?: () => void;
  signal?: AbortSignal;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class HttpApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, HttpApiError.prototype);
  }
}

export class AuthenticationError extends HttpApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends HttpApiError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends HttpApiError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT_ERROR', 408);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// HTTP Client Configuration
// ============================================================================

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;

// ============================================================================
// Core HTTP Client
// ============================================================================

class HttpClient {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const { timeout = DEFAULT_TIMEOUT, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
      }
      throw new NetworkError(error instanceof Error ? error.message : undefined);
    }
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((config.headers as Record<string, string>) || {}),
    };

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const retries = config.retries ?? DEFAULT_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          ...config,
          headers,
        });

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          if (!response.ok) {
            throw new HttpApiError(
              `HTTP ${response.status}: ${response.statusText}`,
              'HTTP_ERROR',
              response.status
            );
          }
          return { success: true, data: undefined as T };
        }

        const data: ApiResponse<T> = await response.json();

        if (!response.ok) {
          const error = data.error || {
            code: 'UNKNOWN_ERROR',
            message: 'An unknown error occurred',
          };
          throw new HttpApiError(
            error.message,
            error.code,
            response.status,
            error.details
          );
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors
        if (error instanceof AuthenticationError) {
          throw error;
        }

        // Don't retry on client errors (4xx)
        if (error instanceof HttpApiError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Exponential backoff for retries
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new HttpApiError('Request failed after retries', 'RETRY_EXHAUSTED');
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(
    endpoint: string,
    body: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// ============================================================================
// API Client Instance
// ============================================================================

const httpClient = new HttpClient();

// ============================================================================
// API Methods
// ============================================================================

/**
 * Set the authentication token for all subsequent requests
 */
export function setAuthToken(token: string | null): void {
  httpClient.setToken(token);
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return httpClient.getToken();
}

/**
 * Onboard a new user
 * Initiates the onboarding process which runs asynchronously
 */
export async function onboard(data: OnboardingData): Promise<ApiResponse<OnboardingResult>> {
  return httpClient.post<OnboardingResult>('/users/onboard', data);
}

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<ApiResponse<UserProfile>> {
  return httpClient.get<UserProfile>('/users/profile');
}

/**
 * Send a chat message (non-streaming)
 */
export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ApiResponse<SendMessageResult>> {
  return httpClient.post<SendMessageResult>('/chat/send', {
    message,
    sessionId,
  });
}

/**
 * Get all chat sessions for the current user
 */
export async function getChatSessions(): Promise<ApiResponse<ChatSession[]>> {
  return httpClient.get<ChatSession[]>('/chat/sessions');
}

/**
 * Stream a chat response using Server-Sent Events (SSE)
 * 
 * This is the primary method for chat interactions, providing real-time
 * streaming responses without WebSocket connections.
 */
export async function streamChat(
  message: string,
  sessionId: string | undefined,
  options: StreamChatOptions
): Promise<void> {
  const { onMessage, onComplete, onError, onStart, signal } = options;
  const url = `${API_BASE_URL}/chat/stream`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = httpClient.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, sessionId }),
      signal,
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        const json = await response.json();
        errorData = json.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error' };
      } catch {
        errorData = {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      onError?.(errorData);
      return;
    }

    if (!response.body) {
      onError?.({ code: 'NO_BODY', message: 'Response body is null' });
      return;
    }

    onStart?.();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    try {
      while (true) {
        // Check if aborted
        if (signal?.aborted) {
          reader.cancel();
          onError?.({ code: 'ABORTED', message: 'Request was aborted' });
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6); // Remove 'data: ' prefix

            // Handle SSE end marker
            if (data === '[DONE]') {
              onComplete?.(fullResponse);
              return;
            }

            try {
              // Try to parse as JSON (for structured SSE events)
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                onMessage?.(content);
              } else if (parsed.content) {
                fullResponse += parsed.content;
                onMessage?.(parsed.content);
              }
            } catch {
              // Not JSON, treat as raw text
              fullResponse += data;
              onMessage?.(data);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          fullResponse += data;
          onMessage?.(data);
        }
      }

      onComplete?.(fullResponse);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onError?.({ code: 'ABORTED', message: 'Request was aborted' });
      } else {
        onError?.({
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Stream reading failed',
        });
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      onError?.({ code: 'ABORTED', message: 'Request was aborted' });
    } else {
      onError?.({
        code: 'REQUEST_ERROR',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }
}

/**
 * Check job status (for polling long-running operations)
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
  return httpClient.get<JobStatus>(`/jobs/status?jobId=${encodeURIComponent(jobId)}`);
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<ApiResponse<{ status: string; version: string }>> {
  return httpClient.get<{ status: string; version: string }>('/health');
}

// ============================================================================
// Export HTTP Client for Advanced Use Cases
// ============================================================================

export { httpClient as HttpClient };

// ============================================================================
// Default Export
// ============================================================================

export default {
  setAuthToken,
  getAuthToken,
  onboard,
  getProfile,
  sendMessage,
  getChatSessions,
  streamChat,
  getJobStatus,
  healthCheck,
};
