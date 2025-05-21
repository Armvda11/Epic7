import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks WebSocket reconnection status
 * @param {Object} options - Options for the hook
 * @param {Function} options.onReconnect - Callback function to execute when a reconnection occurs
 * @param {Function} options.onReconnectFailed - Callback function to execute when reconnection fails
 * @returns {Object} - { isReconnecting, wasReconnected, reconnectBlocked, reconnectInfo }
 */
export default function useWebSocketReconnect({ onReconnect, onReconnectFailed } = {}) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wasReconnected, setWasReconnected] = useState(false);
  const [reconnectBlocked, setReconnectBlocked] = useState(false);
  const [reconnectInfo, setReconnectInfo] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  useEffect(() => {
    // Handler for when WebSocket connection is attempting to reconnect
    const handleReconnecting = (event) => {
      console.log('WebSocket is reconnecting...');
      setIsReconnecting(true);
      setWasReconnected(false);
      setReconnectBlocked(false);
      setReconnectAttempts(prev => prev + 1);
      
      // If we've tried too many times, block further attempts to prevent blank page
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Blocking further attempts.`);
        setReconnectBlocked(true);
        window.dispatchEvent(new CustomEvent('websocketReconnectBlocked', {
          detail: { reason: 'max_attempts_reached' }
        }));
      }
    };
    
    // Handler for when WebSocket successfully reconnected
    const handleReconnected = (event) => {
      console.log('WebSocket reconnected successfully');
      setIsReconnecting(false);
      setWasReconnected(true);
      setReconnectBlocked(false);
      setReconnectInfo(null);
      setReconnectAttempts(0); // Reset attempts counter on successful reconnection
      
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
      console.log('WebSocket reconnection permanently failed');
      setIsReconnecting(false);
      setReconnectInfo(event.detail || { reason: 'unknown' });
      setReconnectAttempts(0); // Reset attempts to allow future reconnections
      
      // Call the onReconnectFailed callback if provided
      if (typeof onReconnectFailed === 'function') {
        onReconnectFailed(event.detail);
      }
    };
    
    // Handler for when reconnection is blocked
    const handleReconnectBlocked = (event) => {
      console.log('WebSocket reconnection blocked:', event.detail);
      setIsReconnecting(false);
      setReconnectBlocked(true);
      setReconnectInfo(event.detail || { reason: 'unknown' });
      
      // After a blocked reconnection, we should reset after some time to allow
      // the user to try again after fixing potential issues
      setTimeout(() => {
        console.log('Resetting reconnect blocked state after timeout');
        setReconnectBlocked(false);
        setReconnectAttempts(0);
      }, 10000); // Wait 10 seconds before allowing reconnect attempts again
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
    reconnectInfo,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
  };
}
