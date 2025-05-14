import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks WebSocket reconnection status
 * @param {Object} options - Options for the hook
 * @param {Function} options.onReconnect - Callback function to execute when a reconnection occurs
 * @param {Function} options.onReconnectFailed - Callback function to execute when reconnection fails
 * @returns {Object} - { isReconnecting, wasReconnected, reconnectBlocked, reconnectInfo }
 */
export function useWebSocketReconnect({ onReconnect, onReconnectFailed } = {}) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wasReconnected, setWasReconnected] = useState(false);
  const [reconnectBlocked, setReconnectBlocked] = useState(false);
  const [reconnectInfo, setReconnectInfo] = useState(null);
  
  useEffect(() => {
    // Handler for when WebSocket connection is attempting to reconnect
    const handleReconnecting = (event) => {
      setIsReconnecting(true);
      setWasReconnected(false);
      setReconnectBlocked(false);
    };
    
    // Handler for when WebSocket successfully reconnected
    const handleReconnected = (event) => {
      setIsReconnecting(false);
      setWasReconnected(true);
      setReconnectBlocked(false);
      setReconnectInfo(null);
      
      // Call the onReconnect callback if provided
      if (typeof onReconnect === 'function') {
        onReconnect(event);
      }
      
      // Reset the wasReconnected flag after a delay
      setTimeout(() => {
        setWasReconnected(false);
      }, 5000);
    };
    
    // Handler for when WebSocket reconnection fails
    const handleReconnectFailed = (event) => {
      setIsReconnecting(false);
      setReconnectInfo(event.detail || { reason: 'unknown' });
      
      // Call the onReconnectFailed callback if provided
      if (typeof onReconnectFailed === 'function') {
        onReconnectFailed(event.detail);
      }
    };
    
    // Handler for when reconnection is blocked
    const handleReconnectBlocked = (event) => {
      setIsReconnecting(false);
      setReconnectBlocked(true);
      setReconnectInfo(event.detail || { reason: 'unknown' });
    };
    
    // Register event listeners
    window.addEventListener('websocketReconnecting', handleReconnecting);
    window.addEventListener('websocketReconnected', handleReconnected);
    window.addEventListener('websocketReconnectFailed', handleReconnectFailed);
    window.addEventListener('websocketReconnectBlocked', handleReconnectBlocked);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('websocketReconnecting', handleReconnecting);
      window.removeEventListener('websocketReconnected', handleReconnected);
      window.removeEventListener('websocketReconnectFailed', handleReconnectFailed);
      window.removeEventListener('websocketReconnectBlocked', handleReconnectBlocked);
    };
  }, [onReconnect, onReconnectFailed]);
  
  return { 
    isReconnecting, 
    wasReconnected,
    reconnectBlocked,
    reconnectInfo
  };
}

export default useWebSocketReconnect;
