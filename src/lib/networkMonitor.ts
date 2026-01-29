/**
 * Network Monitor
 *
 * Production-ready network status monitoring with:
 * - Online/offline status detection
 * - Network quality measurement
 * - Network health metrics
 * - Auto-reconnect on network recovery
 * - Connection type detection
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ConnectionType =
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'mixed'
  | 'none'
  | 'other'
  | 'unknown'
  | 'wifi'
  | 'wimax';

export type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

export interface NetworkMetrics {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Connection type (if available) */
  connectionType: ConnectionType | null;
  /** Effective connection type (if available) */
  effectiveType: EffectiveConnectionType | null;
  /** Estimated effective round-trip time in milliseconds */
  rtt: number | null;
  /** Estimated downstream bandwidth in megabits per second */
  downlink: number | null;
  /** Whether the user has requested reduced data usage */
  saveData: boolean | null;
  /** Maximum downlink speed (if available) */
  downlinkMax: number | null;
}

export interface NetworkQuality {
  /** Overall quality score (0-100) */
  score: number;
  /** Quality level */
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  /** Whether the connection is suitable for high-bandwidth activities */
  isHighBandwidth: boolean;
  /** Whether the connection is suitable for real-time activities */
  isLowLatency: boolean;
  /** Recommended quality for media streaming */
  recommendedQuality: 'high' | 'medium' | 'low' | 'audio-only' | 'none';
}

export interface NetworkHealth {
  /** Current network metrics */
  metrics: NetworkMetrics;
  /** Calculated network quality */
  quality: NetworkQuality;
  /** Timestamp of last update */
  lastUpdated: number;
  /** History of connection changes */
  history: NetworkHistoryEntry[];
}

export interface NetworkHistoryEntry {
  timestamp: number;
  isOnline: boolean;
  connectionType: ConnectionType | null;
  effectiveType: EffectiveConnectionType | null;
}

export interface NetworkMonitorConfig {
  /** Enable periodic health checks */
  enableHealthChecks?: boolean;
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;
  /** Maximum history entries to keep */
  maxHistorySize?: number;
  /** Callback when network status changes */
  onStatusChange?: (health: NetworkHealth) => void;
  /** Callback when connection is restored */
  onReconnect?: (health: NetworkHealth) => void;
  /** Callback when connection is lost */
  onDisconnect?: (health: NetworkHealth) => void;
  /** Callback when quality changes significantly */
  onQualityChange?: (quality: NetworkQuality, previousQuality: NetworkQuality) => void;
}

// ============================================================================
// Network Information API Types
// ============================================================================

interface NetworkInformation extends EventTarget {
  readonly type: ConnectionType;
  readonly effectiveType: EffectiveConnectionType;
  readonly rtt: number;
  readonly downlink: number;
  readonly saveData: boolean;
  readonly downlinkMax: number;
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
  readonly mozConnection?: NetworkInformation;
  readonly webkitConnection?: NetworkInformation;
}

// ============================================================================
// Network Monitor Class
// ============================================================================

export class NetworkMonitor {
  private config: Required<NetworkMonitorConfig>;
  private health: NetworkHealth;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(health: NetworkHealth) => void> = new Set();
  private previousQuality: NetworkQuality | null = null;

  constructor(config: NetworkMonitorConfig = {}) {
    this.config = {
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 5000,
      maxHistorySize: config.maxHistorySize ?? 100,
      onStatusChange: config.onStatusChange ?? (() => {}),
      onReconnect: config.onReconnect ?? (() => {}),
      onDisconnect: config.onDisconnect ?? (() => {}),
      onQualityChange: config.onQualityChange ?? (() => {}),
    };

    this.health = this.createInitialHealth();
    this.init();
  }

  private createInitialHealth(): NetworkHealth {
    return {
      metrics: this.getCurrentMetrics(),
      quality: this.calculateQuality({
        isOnline: navigator.onLine,
        connectionType: null,
        effectiveType: null,
        rtt: null,
        downlink: null,
        saveData: null,
        downlinkMax: null,
      }),
      lastUpdated: Date.now(),
      history: [],
    };
  }

  private init(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for connection changes
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange);
    }

    // Start health checks if enabled
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    // Initial update
    this.updateHealth();
  }

  private getConnection(): NetworkInformation | null {
    const nav = navigator as NavigatorWithConnection;
    return nav.connection || nav.mozConnection || nav.webkitConnection || null;
  }

  private getCurrentMetrics(): NetworkMetrics {
    const connection = this.getConnection();

    return {
      isOnline: navigator.onLine,
      connectionType: connection?.type ?? null,
      effectiveType: connection?.effectiveType ?? null,
      rtt: connection?.rtt ?? null,
      downlink: connection?.downlink ?? null,
      saveData: connection?.saveData ?? null,
      downlinkMax: connection?.downlinkMax ?? null,
    };
  }

  private calculateQuality(metrics: NetworkMetrics): NetworkQuality {
    if (!metrics.isOnline) {
      return {
        score: 0,
        level: 'offline',
        isHighBandwidth: false,
        isLowLatency: false,
        recommendedQuality: 'none',
      };
    }

    // Calculate score based on connection type and metrics
    let score = 50; // Base score

    // Connection type scoring
    switch (metrics.connectionType) {
      case 'ethernet':
        score += 30;
        break;
      case 'wifi':
        score += 25;
        break;
      case 'cellular':
        score += 10;
        break;
      case 'bluetooth':
        score -= 10;
        break;
      case 'none':
        score = 0;
        break;
    }

    // Effective type scoring
    switch (metrics.effectiveType) {
      case '4g':
        score += 15;
        break;
      case '3g':
        score += 5;
        break;
      case '2g':
        score -= 20;
        break;
      case 'slow-2g':
        score -= 30;
        break;
    }

    // RTT scoring (lower is better)
    if (metrics.rtt !== null) {
      if (metrics.rtt < 50) score += 10;
      else if (metrics.rtt < 100) score += 5;
      else if (metrics.rtt < 300) score += 0;
      else if (metrics.rtt < 500) score -= 10;
      else score -= 20;
    }

    // Downlink scoring (higher is better)
    if (metrics.downlink !== null) {
      if (metrics.downlink >= 10) score += 10;
      else if (metrics.downlink >= 5) score += 5;
      else if (metrics.downlink >= 1) score += 0;
      else if (metrics.downlink >= 0.5) score -= 10;
      else score -= 20;
    }

    // Save data mode reduces quality
    if (metrics.saveData) {
      score -= 15;
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine quality level
    let level: NetworkQuality['level'];
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else if (score > 0) level = 'poor';
    else level = 'offline';

    // Determine capabilities
    const isHighBandwidth = score >= 60 && metrics.downlink !== null && metrics.downlink >= 1;
    const isLowLatency = score >= 60 && metrics.rtt !== null && metrics.rtt < 200;

    // Determine recommended quality
    let recommendedQuality: NetworkQuality['recommendedQuality'];
    if (score >= 80) recommendedQuality = 'high';
    else if (score >= 60) recommendedQuality = 'medium';
    else if (score >= 40) recommendedQuality = 'low';
    else if (score > 0) recommendedQuality = 'audio-only';
    else recommendedQuality = 'none';

    return {
      score,
      level,
      isHighBandwidth,
      isLowLatency,
      recommendedQuality,
    };
  }

  private updateHealth(): void {
    const metrics = this.getCurrentMetrics();
    const quality = this.calculateQuality(metrics);
    const timestamp = Date.now();

    // Add to history
    const historyEntry: NetworkHistoryEntry = {
      timestamp,
      isOnline: metrics.isOnline,
      connectionType: metrics.connectionType,
      effectiveType: metrics.effectiveType,
    };

    const newHistory = [...this.health.history, historyEntry];
    if (newHistory.length > this.config.maxHistorySize) {
      newHistory.shift();
    }

    // Check for quality changes
    if (this.previousQuality && this.previousQuality.level !== quality.level) {
      this.config.onQualityChange(quality, this.previousQuality);
    }

    this.previousQuality = quality;

    // Update health
    this.health = {
      metrics,
      quality,
      lastUpdated: timestamp,
      history: newHistory,
    };

    // Notify listeners
    this.notifyListeners();
    this.config.onStatusChange(this.health);
  }

  private handleOnline = (): void => {
    this.updateHealth();
    this.config.onReconnect(this.health);
  };

  private handleOffline = (): void => {
    this.updateHealth();
    this.config.onDisconnect(this.health);
  };

  private handleConnectionChange = (): void => {
    this.updateHealth();
  };

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.updateHealth();
    }, this.config.healthCheckInterval);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.health);
      } catch (error) {
        console.error('[NetworkMonitor] Error in listener:', error);
      }
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current network health
   */
  getHealth(): NetworkHealth {
    return { ...this.health };
  }

  /**
   * Get current network metrics
   */
  getMetrics(): NetworkMetrics {
    return { ...this.health.metrics };
  }

  /**
   * Get current network quality
   */
  getQuality(): NetworkQuality {
    return { ...this.health.quality };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.health.metrics.isOnline;
  }

  /**
   * Check if connection is high bandwidth
   */
  isHighBandwidth(): boolean {
    return this.health.quality.isHighBandwidth;
  }

  /**
   * Check if connection has low latency
   */
  isLowLatency(): boolean {
    return this.health.quality.isLowLatency;
  }

  /**
   * Subscribe to network health changes
   */
  subscribe(listener: (health: NetworkHealth) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Force a health check update
   */
  checkNow(): NetworkHealth {
    this.updateHealth();
    return this.getHealth();
  }

  /**
   * Start health checks
   */
  start(): void {
    if (!this.healthCheckTimer) {
      this.startHealthChecks();
    }
  }

  /**
   * Stop health checks
   */
  stop(): void {
    this.stopHealthChecks();
  }

  /**
   * Destroy the monitor and cleanup
   */
  destroy(): void {
    this.stopHealthChecks();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    const connection = this.getConnection();
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange);
    }

    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalMonitor: NetworkMonitor | null = null;

/**
 * Get or create the global network monitor instance
 */
export function getNetworkMonitor(config?: NetworkMonitorConfig): NetworkMonitor {
  if (!globalMonitor) {
    globalMonitor = new NetworkMonitor(config);
  }
  return globalMonitor;
}

/**
 * Destroy the global network monitor instance
 */
export function destroyNetworkMonitor(): void {
  if (globalMonitor) {
    globalMonitor.destroy();
    globalMonitor = null;
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseNetworkMonitorResult {
  health: NetworkHealth;
  isOnline: boolean;
  quality: NetworkQuality;
  checkNow: () => NetworkHealth;
}

/**
 * React hook for network monitoring
 */
export function useNetworkMonitor(config?: NetworkMonitorConfig): UseNetworkMonitorResult {
  const monitorRef = useRef<NetworkMonitor | null>(null);
  const [health, setHealth] = useState<NetworkHealth>(() => {
    if (!monitorRef.current) {
      monitorRef.current = new NetworkMonitor({
        ...config,
        onStatusChange: (newHealth) => {
          setHealth(newHealth);
          config?.onStatusChange?.(newHealth);
        },
      });
    }
    return monitorRef.current.getHealth();
  });

  const checkNow = useCallback(() => {
    return monitorRef.current?.checkNow() ?? health;
  }, [health]);

  useEffect(() => {
    return () => {
      monitorRef.current?.destroy();
      monitorRef.current = null;
    };
  }, []);

  return {
    health,
    isOnline: health.metrics.isOnline,
    quality: health.quality,
    checkNow,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wait for network to be online
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.onLine) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const handleOnline = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('online', handleOnline);
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Check if the current connection supports a specific quality level
 */
export function supportsQuality(
  quality: NetworkQuality,
  requiredQuality: NetworkQuality['recommendedQuality']
): boolean {
  const qualityLevels: Record<NetworkQuality['recommendedQuality'], number> = {
    none: 0,
    'audio-only': 1,
    low: 2,
    medium: 3,
    high: 4,
  };

  return qualityLevels[quality.recommendedQuality] >= qualityLevels[requiredQuality];
}

/**
 * Get a user-friendly description of the connection
 */
export function getConnectionDescription(metrics: NetworkMetrics): string {
  if (!metrics.isOnline) {
    return 'Offline';
  }

  const parts: string[] = [];

  if (metrics.connectionType) {
    parts.push(metrics.connectionType.charAt(0).toUpperCase() + metrics.connectionType.slice(1));
  }

  if (metrics.effectiveType) {
    parts.push(metrics.effectiveType.toUpperCase());
  }

  if (metrics.downlink !== null) {
    parts.push(`${metrics.downlink} Mbps`);
  }

  if (metrics.saveData) {
    parts.push('(Data Saver On)');
  }

  return parts.join(' • ') || 'Online';
}

export default NetworkMonitor;
