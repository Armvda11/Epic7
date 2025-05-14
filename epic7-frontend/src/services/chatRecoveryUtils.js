/**
 * Chat Recovery Utilities
 * 
 * Functions to help manage recovery from various chat errors,
 * particularly focusing on Hibernate LazyInitializationException issues
 */

import { isHibernateLazyLoadingError } from './chatErrorUtils';
import { logRecoveryAttempt, logCircuitBreaker } from './chatDebugLogger';

/**
 * Get recovery delay based on retry count with exponential backoff
 * 
 * @param {number} retryCount - Current retry count
 * @returns {number} - Delay in milliseconds
 */
export function getRecoveryDelay(retryCount) {
  // Base delay of 1 second
  const baseDelay = 1000;
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  // Capped at 15 seconds to avoid extremely long delays
  return Math.min(baseDelay * Math.pow(2, retryCount), 15000);
}

/**
 * Checks if circuit breaker should be tripped based on retry attempts
 * 
 * @param {Object} recoveryData - Data about recovery attempts for a room
 * @returns {Boolean} - True if circuit breaker should be tripped
 */
export function shouldTripCircuitBreaker(recoveryData) {
  if (!recoveryData) {
    return false;
  }
  
  // Circuit breaker conditions:
  // 1. More than 5 consecutive attempts
  if (recoveryData.count >= 5) {
    logCircuitBreaker(
      'room-key', 
      'tripped', 
      'max_attempts', 
      { attempts: recoveryData.count }
    );
    return true;
  }
  
  // 2. Too many attempts in a short time window (5 attempts in 60 seconds)
  if (recoveryData.attemptTimestamps) {
    const recentAttempts = recoveryData.attemptTimestamps.filter(
      timestamp => Date.now() - timestamp < 60000
    ).length;
    
    if (recentAttempts >= 5) {
      logCircuitBreaker(
        'room-key', 
        'tripped', 
        'rate_limit', 
        { recentAttempts, window: '60s' }
      );
      return true;
    }
  }
  
  return false;
}

/**
 * Track a new recovery attempt for a specific room
 * 
 * @param {Object} service - The ChatWebSocketService instance
 * @param {string} roomKey - Key identifying the room
 * @param {string} roomType - Type of room (for logging)
 * @returns {Object} - Updated recovery data
 */
export function trackRecoveryAttempt(service, roomKey, roomType) {
  // Initialize recovery attempts tracking if needed
  if (!service.recoveryAttempts) {
    service.recoveryAttempts = {};
  }
  
  // Initialize or update recovery data for this room
  if (!service.recoveryAttempts[roomKey]) {
    service.recoveryAttempts[roomKey] = {
      count: 1,
      lastAttempt: Date.now(),
      attemptTimestamps: [Date.now()]
    };
  } else {
    service.recoveryAttempts[roomKey].count++;
    service.recoveryAttempts[roomKey].lastAttempt = Date.now();
    
    // Initialize timestamps array if needed
    if (!service.recoveryAttempts[roomKey].attemptTimestamps) {
      service.recoveryAttempts[roomKey].attemptTimestamps = [];
    }
    
    // Add current timestamp
    service.recoveryAttempts[roomKey].attemptTimestamps.push(Date.now());
    
    // Keep only the last 10 timestamps to avoid memory bloat
    if (service.recoveryAttempts[roomKey].attemptTimestamps.length > 10) {
      service.recoveryAttempts[roomKey].attemptTimestamps.shift();
    }
  }
  
  const attemptCount = service.recoveryAttempts[roomKey].count;
  console.log(`Tentative de récupération #${attemptCount} pour le salon ${roomType} (${roomKey})`);
  
  // Log recovery attempt for debugging
  logRecoveryAttempt(roomKey, attemptCount, 5, {
    roomType: roomType,
    timestamps: service.recoveryAttempts[roomKey].attemptTimestamps
  });
  
  return service.recoveryAttempts[roomKey];
}

/**
 * Reset recovery attempt counter after successful recovery
 * 
 * @param {Object} service - The ChatWebSocketService instance 
 * @param {string} roomKey - Key identifying the room
 */
export function resetRecoveryAttempts(service, roomKey) {
  if (service.recoveryAttempts && service.recoveryAttempts[roomKey]) {
    console.log(`Réinitialisation du compteur de récupération pour ${roomKey}`);
    
    // Log the reset for debugging
    logCircuitBreaker(roomKey, 'reset', 'success', {
      previousCount: service.recoveryAttempts[roomKey].count,
      resetTime: new Date().toISOString()
    });
    
    service.recoveryAttempts[roomKey].count = 0;
    service.recoveryAttempts[roomKey].lastAttempt = Date.now();
  }
}

/**
 * Attempts to recover from a Hibernate lazy loading error with circuit breaker pattern
 * 
 * @param {Object} service - The ChatWebSocketService instance
 * @param {Object} payload - The error payload
 * @returns {Promise} - Resolves to {success, roomKey, retryCount} when recovery attempt is complete
 */
export function recoverFromHibernateError(service, payload) {
  return new Promise((resolve) => {
    // Only attempt recovery if we have a lastRoomRequest and a connected client
    if (!service.lastRoomRequest || !service.stompClient || !service.stompClient.connected) {
      resolve({success: false, reason: 'no_connection'});
      return;
    }
    
    const { type, groupId } = service.lastRoomRequest;
    const roomKey = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    
    // Check if we already have recovery data for this room
    if (service.recoveryAttempts && service.recoveryAttempts[roomKey]) {
      // If we already hit the circuit breaker threshold, don't even try
      if (service.recoveryAttempts[roomKey].count >= 5) {
        console.warn(`Circuit breaker: arrêt des tentatives de récupération pour ${type} après ${service.recoveryAttempts[roomKey].count} essais.`);
        resolve({
          success: false, 
          roomKey,
          retryCount: service.recoveryAttempts[roomKey].count,
          reason: 'circuit_breaker'
        });
        return;
      }
    }
    
    // Track this recovery attempt
    const recoveryData = trackRecoveryAttempt(service, roomKey, type);
    
    // Check if circuit breaker should be tripped
    if (shouldTripCircuitBreaker(recoveryData)) {
      console.warn(`Circuit breaker: arrêt des tentatives de récupération pour ${type} après ${recoveryData.count} essais.`);
      resolve({
        success: false, 
        roomKey,
        retryCount: recoveryData.count,
        reason: 'circuit_breaker'
      });
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = getRecoveryDelay(recoveryData.count - 1);
    console.log(`Tentative de récupération après ${delay}ms pour erreur Hibernate. Salon: ${type}`);
    
    // Add a delay before retry to allow the backend session to stabilize
    setTimeout(() => {
      try {
        // Only attempt if still connected
        if (!service.stompClient || !service.stompClient.connected) {
          console.warn("Le client STOMP n'est plus connecté, annulation de la récupération.");
          resolve({
            success: false, 
            roomKey,
            retryCount: recoveryData.count,
            reason: 'disconnected'
          });
          return;
        }
        
        // Check one more time before sending the request
        if (recoveryData.count >= 5) {
          console.warn(`Limite de tentatives atteinte (${recoveryData.count}/5). Abandon de la récupération.`);
          resolve({
            success: false,
            roomKey,
            retryCount: recoveryData.count,
            reason: 'max_retries'
          });
          return;
        }
        
        // Send the request again
        service.stompClient.send('/app/chat.getRoom', {}, JSON.stringify({ 
          type: type,
          groupId: groupId
        }));
        
        // Schedule reset of recovery counter if no more errors occur
        setTimeout(() => {
          const lastAttemptTime = service.recoveryAttempts[roomKey]?.lastAttempt || 0;
          if (Date.now() - lastAttemptTime >= 30000) {
            resetRecoveryAttempts(service, roomKey);
          }
        }, 30000);
        
        resolve({
          success: true,
          roomKey,
          retryCount: recoveryData.count
        });
      } catch (e) {
        console.error('Erreur lors de la tentative de récupération:', e);
        resolve({
          success: false,
          roomKey,
          retryCount: recoveryData.count,
          reason: 'error',
          error: e
        });
      }
    }, delay);
  });
}

export default {
  getRecoveryDelay,
  shouldTripCircuitBreaker,
  trackRecoveryAttempt,
  resetRecoveryAttempts,
  recoverFromHibernateError
};
