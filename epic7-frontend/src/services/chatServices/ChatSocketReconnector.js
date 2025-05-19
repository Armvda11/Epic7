// ChatSocketReconnector.js
// Helper class to handle WebSocket reconnection logic
import ChatWebSocketService from './ChatWebSocketService';

class ChatSocketReconnector {
  constructor() {
    this.initialized = false;
    this.reconnectInterval = null;
    this.backoffDelay = 1000; // Initial delay is 1 second
    this.maxDelay = 30000;    // Max delay is 30 seconds (increased from 5s)
    this.maxRetries = 5;     // Max number of retries
    this.retryCount = 0;
    this.lockUntil = 0;      // Timestamp until which reconnection is locked
    this.persistentErrorDetected = false; // Flag for persistent errors
  }
  
  /**
   * Initialize the reconnector with a callback
   * @param {Function} onReconnectCallback - callback to execute when reconnect is triggered
   */
  init(onReconnectCallback) {
    if (this.initialized) return;
    
    this.onReconnect = onReconnectCallback;
    this.initialized = true;
    
    // Setup global error listener for connection issues
    window.addEventListener('websocketError', this.handleWebSocketError);
  }
  
  /**
   * Cleans up the reconnector
   */
  cleanup() {
    window.removeEventListener('websocketError', this.handleWebSocketError);
    this.stopReconnectInterval();
    this.initialized = false;
  }
  
  /**
   * Handle WebSocket errors
   * @param {CustomEvent} event - the error event
   */
  handleWebSocketError = (event) => {
    const error = event?.detail;
    console.warn('WebSocket error detected by reconnector', error);
    
    // Check if we're in a lockout period - don't attempt reconnection
    if (Date.now() < this.lockUntil) {
      console.log(`Reconnection locked for ${Math.ceil((this.lockUntil - Date.now()) / 1000)}s due to previous errors`);
      return;
    }
    
    // Check for persistent error flags
    if (error && (
        error.code === 'HIBERNATE_ERROR_MAX_RETRY' ||
        error.code === 'HIBERNATE_ERROR_PERSISTENT' ||
        error.code === 'MAX_RECONNECT_ATTEMPTS')
    ) {
      console.log('Persistent error detected - applying 60s lockout before any reconnection attempts');
      this.persistentErrorDetected = true;
      this.lockUntil = Date.now() + 60000; // 60 second lockout
      return;
    }
    
    // Check if the error is related to Hibernate lazy initialization
    if (error && (
        (typeof error === 'string' && error.includes('failed to lazily initialize a collection of role')) ||
        (error.message && error.message.includes('failed to lazily initialize a collection of role')) ||
        (error.details && error.details.message && error.details.message.includes('failed to lazily initialize a collection of role'))
    )) {
      console.log('Detected Hibernate lazy initialization error - checking if reconnection is appropriate');
      
      // Don't try to reconnect if we've seen persistent errors recently
      if (this.persistentErrorDetected) {
        console.log('Skipping reconnect due to persistent errors detected recently');
        return;
      }
      
      this.startReconnection();
    }
    
    // Check if connection was lost
    if (error && 
        (error.message?.includes('Lost connection') || 
         error.message?.includes('Connection closed') ||
         error.type === 'close' ||
         error.code === 1006)) {
      console.log('Detected lost connection - triggering reconnect');
      this.startReconnection();
    }
  }
  
  /**
   * Start the reconnection process
   */
  startReconnection() {
    // Don't start a new interval if one is already running
    if (this.reconnectInterval) {
      return;
    }
    
    // Check for lockout period
    if (Date.now() < this.lockUntil) {
      console.log(`Reconnection blocked - currently in ${Math.ceil((this.lockUntil - Date.now()) / 1000)}s cooldown period`);
      
      // Dispatch reconnect failed event when blocked
      const blockedEvent = new CustomEvent('websocketReconnectBlocked', { 
        detail: { 
          reason: 'cooldown', 
          unlockIn: Math.ceil((this.lockUntil - Date.now()) / 1000)
        } 
      });
      window.dispatchEvent(blockedEvent);
      
      return;
    }
    
    // Reset for new attempt
    this.retryCount = 0;
    this.backoffDelay = 1000; // Reset to initial delay
    
    // Dispatch reconnecting event
    const reconnectingEvent = new CustomEvent('websocketReconnecting');
    window.dispatchEvent(reconnectingEvent);
    
    this.doReconnect();
  }
  
  /**
   * Perform a reconnection attempt with exponential backoff
   */
  doReconnect = () => {
    // Clear any existing interval
    this.stopReconnectInterval();
    
    // Check if we've exceeded max retries
    if (this.retryCount >= this.maxRetries) {
      console.error(`WebSocket reconnection failed after ${this.maxRetries} attempts`);
      
      // Enable lockout to prevent immediate retries
      this.lockUntil = Date.now() + 60000; // 60 second lockout
      this.persistentErrorDetected = true;
      
      this.dispatchReconnectFailedEvent();
      return;
    }
    
    console.log(`Attempting WebSocket reconnection (${this.retryCount + 1}/${this.maxRetries})...`);
    
    try {
      // Disconnect first to clean up any existing connections
      ChatWebSocketService.disconnect();
      
      // Execute reconnect callback
      if (typeof this.onReconnect === 'function') {
        this.onReconnect();
      }
      
    } catch (error) {
      console.error('Error during reconnection attempt:', error);
      
      // If this is a serious error, we might want to lockout
      if (this.retryCount > 2) {
        this.lockUntil = Date.now() + 30000; // 30 second lockout after repeated failures
      }
    }
    
    // Schedule next retry with exponential backoff
    this.retryCount++;
    
    // Apply exponential backoff with jitter
    const jitter = Math.random() * 1000;
    this.backoffDelay = Math.min(this.backoffDelay * 1.5 + jitter, this.maxDelay);
    
    console.log(`Next reconnection attempt in ${Math.round(this.backoffDelay/1000)}s if needed`);
    
    this.reconnectInterval = setTimeout(this.doReconnect, this.backoffDelay);
  }
  
  /**
   * Stop the reconnection interval
   */
  stopReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
  
  /**
   * Reset the retry counter on successful connection
   */
  resetRetryCount() {
    this.retryCount = 0;
    this.stopReconnectInterval();
    
    // Reset error flags on successful connection
    this.persistentErrorDetected = false;
    this.lockUntil = 0;
    
    // Dispatch reconnected event
    const reconnectedEvent = new CustomEvent('websocketReconnected');
    window.dispatchEvent(reconnectedEvent);
  }
  
  /**
   * Dispatch an event when reconnection failed after all retries
   */
  dispatchReconnectFailedEvent() {
    const failedEvent = new CustomEvent('websocketReconnectFailed', { 
      detail: { retries: this.maxRetries } 
    });
    window.dispatchEvent(failedEvent);
  }
  
  /**
   * Force a reset of the reconnector state (for use when manually reloading)
   */
  forceReset() {
    this.stopReconnectInterval();
    this.retryCount = 0;
    this.persistentErrorDetected = false;
    this.lockUntil = 0;
    this.backoffDelay = 1000;
    
    console.log('Reconnector state forcibly reset');
  }
}

// Export as singleton
export default new ChatSocketReconnector();
