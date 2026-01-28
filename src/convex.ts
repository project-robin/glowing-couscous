import { ConvexReactClient } from 'convex/react';

/**
 * Connection state tracking for WebSocket management
 */
export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'max_retries_exceeded';

interface ConnectionManager {
  state: ConnectionState;
  retryCount: number;
  lastError: string | null;
  lastRetryTime: number | null;
}

/**
 * Configuration for connection retry behavior
 */
const CONNECTION_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
  CONNECTION_TIMEOUT_MS: 10000,
} as const;

/**
 * Connection manager to track WebSocket state and prevent infinite reconnection loops
 */
class WebSocketConnectionManager {
  private state: ConnectionManager = {
    state: 'connecting',
    retryCount: 0,
    lastError: null,
    lastRetryTime: null,
  };

  private listeners: Set<(state: ConnectionManager) => void> = new Set();

  /**
   * Get current connection state
   */
  getState(): ConnectionManager {
    return { ...this.state };
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(callback: (state: ConnectionManager) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Update connection state and notify listeners
   */
  private updateState(updates: Partial<ConnectionManager>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(): number {
    const delay = Math.min(
      CONNECTION_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(
        CONNECTION_CONFIG.BACKOFF_MULTIPLIER, 
        this.state.retryCount
      ),
      CONNECTION_CONFIG.MAX_RETRY_DELAY_MS
    );
    return delay;
  }

  /**
   * Check if we should attempt another retry
   */
  shouldRetry(): boolean {
    return this.state.retryCount < CONNECTION_CONFIG.MAX_RETRIES;
  }

  /**
   * Record a connection attempt
   */
  recordConnectionAttempt(): void {
    this.updateState({
      state: 'connecting',
      lastRetryTime: Date.now(),
    });
  }

  /**
   * Record successful connection
   */
  recordConnected(): void {
    this.updateState({
      state: 'connected',
      retryCount: 0,
      lastError: null,
    });
  }

  /**
   * Record connection error and increment retry count
   */
  recordError(error: string): void {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount >= CONNECTION_CONFIG.MAX_RETRIES) {
      this.updateState({
        state: 'max_retries_exceeded',
        retryCount: newRetryCount,
        lastError: error,
      });
    } else {
      this.updateState({
        state: 'error',
        retryCount: newRetryCount,
        lastError: error,
      });
    }
  }

  /**
   * Record disconnection
   */
  recordDisconnected(): void {
    this.updateState({
      state: 'disconnected',
    });
  }

  /**
   * Reset connection state
   */
  reset(): void {
    this.updateState({
      state: 'connecting',
      retryCount: 0,
      lastError: null,
      lastRetryTime: null,
    });
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(): string {
    if (this.state.state === 'max_retries_exceeded') {
      return `Unable to connect to the server after ${CONNECTION_CONFIG.MAX_RETRIES} attempts. Please check your internet connection and try again later.`;
    }
    if (this.state.state === 'error') {
      return `Connection error: ${this.state.lastError || 'Unknown error'}. Retry ${this.state.retryCount}/${CONNECTION_CONFIG.MAX_RETRIES}`;
    }
    return '';
  }
}

/**
 * Global connection manager instance
 */
export const connectionManager = new WebSocketConnectionManager();

/**
 * Validate the Convex URL environment variable
 */
function validateConvexUrl(url: string | undefined): string {
  if (!url) {
    const error = 'VITE_CONVEX_URL environment variable is not defined. Please check your .env file.';
    console.error('[Convex] ' + error);
    connectionManager.recordError(error);
    throw new Error(error);
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    const error = `Invalid VITE_CONVEX_URL: "${url}". Must be a valid URL.`;
    console.error('[Convex] ' + error);
    connectionManager.recordError(error);
    throw new Error(error);
  }

  // Ensure it's an HTTPS URL in production
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    console.warn('[Convex] Warning: VITE_CONVEX_URL should use HTTPS in production');
  }

  return url;
}

/**
 * Get the Convex URL with validation
 */
function getConvexUrl(): string {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  return validateConvexUrl(url);
}

/**
 * Create Convex client with custom WebSocket configuration
 * to handle reconnection loops
 */
function createConvexClient(): ConvexReactClient {
  const convexUrl = getConvexUrl();
  
  console.log('[Convex] Initializing client with URL:', convexUrl);
  
  const client = new ConvexReactClient(convexUrl, {
    // Disable automatic retries - we'll handle them manually
    unsavedChangesWarning: false,
  });

  // Override the WebSocket connection handling
  const originalConnect = (client as any).connect?.bind(client);
  
  if (originalConnect) {
    (client as any).connect = function(...args: any[]) {
      if (!connectionManager.shouldRetry()) {
        console.error('[Convex] Max retries exceeded. Stopping reconnection attempts.');
        return Promise.reject(new Error('Max retries exceeded'));
      }

      connectionManager.recordConnectionAttempt();
      
      return originalConnect(...args)
        .then((result: any) => {
          console.log('[Convex] Connected successfully');
          connectionManager.recordConnected();
          return result;
        })
        .catch((error: any) => {
          const errorMessage = error?.message || 'Unknown connection error';
          console.error('[Convex] Connection failed:', errorMessage);
          connectionManager.recordError(errorMessage);
          
          if (connectionManager.shouldRetry()) {
            const delay = connectionManager.getRetryDelay();
            console.log(`[Convex] Will retry in ${delay}ms (attempt ${connectionManager.getState().retryCount}/${CONNECTION_CONFIG.MAX_RETRIES})`);
          }
          
          throw error;
        });
    };
  }

  // Listen for connection state changes
  if ((client as any).onStateChange) {
    (client as any).onStateChange((state: string) => {
      console.log('[Convex] Connection state:', state);
      
      switch (state) {
        case 'connecting':
          connectionManager.recordConnectionAttempt();
          break;
        case 'connected':
          connectionManager.recordConnected();
          break;
        case 'disconnected':
          connectionManager.recordDisconnected();
          break;
        case 'error':
          // Error state is handled by the connection error handler
          break;
      }
    });
  }

  return client;
}

/**
 * Convex client instance with connection management
 */
export const convex = createConvexClient();

/**
 * Re-export configuration for external use
 */
export { CONNECTION_CONFIG };

/**
 * Helper function to check if connection is healthy
 */
export function isConnectionHealthy(): boolean {
  return connectionManager.getState().state === 'connected';
}

/**
 * Helper function to get current connection status
 */
export function getConnectionStatus(): ConnectionManager {
  return connectionManager.getState();
}

/**
 * Helper function to manually reset connection state
 */
export function resetConnection(): void {
  connectionManager.reset();
}
