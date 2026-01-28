import { useState, useEffect } from 'react';
import { 
  connectionManager, 
  CONNECTION_CONFIG,
  resetConnection 
} from '../convex';
import { Wifi, WifiOff, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

/**
 * ConnectionStatus Component
 * 
 * Displays the current WebSocket connection status to the user
 * and provides actions to retry or reset the connection.
 */
export function ConnectionStatus() {
  const [state, setState] = useState(connectionManager.getState());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = connectionManager.subscribe((newState) => {
      setState(newState);
      // Show status when there's an issue
      setIsVisible(newState.state === 'error' || newState.state === 'max_retries_exceeded');
    });

    // Initial check
    setState(connectionManager.getState());

    return () => unsubscribe();
  }, []);

  const handleRetry = () => {
    resetConnection();
    window.location.reload();
  };

  // Don't render anything if connected or in initial connecting state
  if (state.state === 'connected' || state.state === 'connecting' && state.retryCount === 0) {
    return null;
  }

  // Don't render if not visible and not in error state
  if (!isVisible && state.state !== 'error' && state.state !== 'max_retries_exceeded') {
    return null;
  }

  const getStatusConfig = () => {
    switch (state.state) {
      case 'connecting':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-blue-400" />,
          title: 'Connecting...',
          message: `Attempt ${state.retryCount}/${CONNECTION_CONFIG.MAX_RETRIES}`,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          textColor: 'text-blue-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          title: 'Connection Issue',
          message: connectionManager.getErrorMessage(),
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-400',
        };
      case 'max_retries_exceeded':
        return {
          icon: <WifiOff className="w-5 h-5 text-red-400" />,
          title: 'Connection Failed',
          message: connectionManager.getErrorMessage(),
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-400',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-5 h-5 text-gray-400" />,
          title: 'Disconnected',
          message: 'Connection lost. Attempting to reconnect...',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          textColor: 'text-gray-400',
        };
      default:
        return {
          icon: <Wifi className="w-5 h-5 text-green-400" />,
          title: 'Connected',
          message: 'Connection established',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4 fade-in duration-300`}
      role="alert"
      aria-live="polite"
    >
      <div 
        className={`
          rounded-lg border ${config.borderColor} ${config.bgColor} 
          backdrop-blur-md p-4 shadow-lg
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${config.textColor} text-sm`}>
              {config.title}
            </h3>
            <p className="text-gray-300 text-xs mt-1 leading-relaxed">
              {config.message}
            </p>
            
            {(state.state === 'error' || state.state === 'max_retries_exceeded') && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleRetry}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-medium text-white
                    bg-mystic-purple hover:bg-mystic-purple-light
                    rounded-md transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-mystic-gold/50
                  "
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
                
                <button
                  onClick={() => setIsVisible(false)}
                  className="
                    inline-flex items-center px-3 py-1.5
                    text-xs font-medium text-gray-300
                    hover:text-white
                    rounded-md transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-mystic-gold/50
                  "
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
          
          {/* Close button for non-critical states */}
          {state.state === 'connecting' && (
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Progress bar for retry attempts */}
        {state.state === 'connecting' && state.retryCount > 0 && (
          <div className="mt-3">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-400 transition-all duration-500 ease-out"
                style={{ 
                  width: `${(state.retryCount / CONNECTION_CONFIG.MAX_RETRIES) * 100}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Retry attempt {state.retryCount} of {CONNECTION_CONFIG.MAX_RETRIES}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ConnectionStatusBadge Component
 * 
 * A compact badge for showing connection status in headers or toolbars
 */
export function ConnectionStatusBadge() {
  const [state, setState] = useState(connectionManager.getState());

  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const getStatusColor = () => {
    switch (state.state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
      case 'max_retries_exceeded':
        return 'bg-red-500';
      case 'disconnected':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = () => {
    switch (state.state) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      case 'max_retries_exceeded':
        return 'Failed';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div 
      className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-800/50 border border-gray-700"
      title={`Connection: ${getStatusLabel()}${state.retryCount > 0 ? ` (Retry ${state.retryCount}/${CONNECTION_CONFIG.MAX_RETRIES})` : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-300">{getStatusLabel()}</span>
    </div>
  );
}
