/**
 * Utility functions to handle backend errors in the Epic7 chat application
 */

/**
 * Detects if an error is related to the Hibernate lazy loading issue
 * 
 * @param {Object|String} error - The error object or message
 * @returns {Boolean} - True if it's a Hibernate lazy loading error
 */
export function isHibernateLazyLoadingError(error) {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error || JSON.stringify(error));
  
  return errorMessage.includes('failed to lazily initialize a collection of role') ||
         errorMessage.includes('LazyInitializationException') ||
         errorMessage.includes('could not initialize proxy') ||
         errorMessage.includes('collection of role: com.epic7.model.ChatRoom.userIds');
}

/**
 * Detects if an error is related to WebSocket connection issues
 * 
 * @param {Object|String} error - The error object or message
 * @returns {Boolean} - True if it's a WebSocket connection error
 */
export function isWebSocketConnectionError(error) {
  if (!error) return false;
  
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error || JSON.stringify(error));
  
  return errorMessage.includes('WebSocket connection') ||
         errorMessage.includes('Connection closed') ||
         errorMessage.includes('Lost connection') ||
         (error.code && [1000, 1001, 1006, 1011, 1012].includes(error.code));
}

/**
 * Detects if a message contains a server-side error
 * 
 * @param {Object} message - The message object received from the server
 * @returns {Boolean} - True if it's a server error message
 */
export function isServerErrorMessage(message) {
  if (!message) return false;
  
  try {
    // If it's a string, try to parse it
    const payload = typeof message === 'string' 
      ? JSON.parse(message) 
      : (message.body ? JSON.parse(message.body) : message);
    
    return payload && payload.error && (
      payload.error === 'INTERNAL_SERVER_ERROR' || 
      payload.error.includes('Error') || 
      payload.message && isHibernateLazyLoadingError(payload.message)
    );
  } catch (e) {
    return false;
  }
}

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
 * Attempts to recover from a Hibernate lazy loading error
 * 
 * @param {Object} service - The ChatWebSocketService instance
 * @param {Object} payload - The error payload
 * @returns {Promise} - Resolves when recovery attempt is complete
 */
export function recoverFromLazyLoadingError(service, payload) {
  return new Promise((resolve) => {
    // Only attempt recovery if we have a lastRoomRequest and a connected client
    if (!service.lastRoomRequest || !service.stompClient || !service.stompClient.connected) {
      resolve(false);
      return;
    }
    
    // Initialize recovery attempts counter if it doesn't exist
    if (!service.recoveryAttempts) {
      service.recoveryAttempts = {};
    }
    
    const { type, groupId } = service.lastRoomRequest;
    const roomKey = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    
    // Initialize or increment retry counter for this room
    if (!service.recoveryAttempts[roomKey]) {
      service.recoveryAttempts[roomKey] = {
        count: 1,
        lastAttempt: Date.now()
      };
    } else {
      service.recoveryAttempts[roomKey].count++;
      service.recoveryAttempts[roomKey].lastAttempt = Date.now();
    }
    
    const retryCount = service.recoveryAttempts[roomKey].count;
    
    // Circuit breaker: stop retrying after 5 attempts for a specific room
    if (retryCount > 5) {
      console.warn(`Circuit breaker: arrêt des tentatives de récupération pour le salon ${type} après ${retryCount} essais.`);
      resolve(false);
      return;
    }
    
    console.log(`Tentative de récupération #${retryCount} pour erreur lazy loading. Salon: ${type}`);
    
    // Calculate delay with exponential backoff
    const delay = getRecoveryDelay(retryCount - 1);
    
    // Add a delay before retry to allow the backend session to stabilize
    setTimeout(() => {
      try {
        // Only attempt if still connected
        if (!service.stompClient || !service.stompClient.connected) {
          console.warn("Le client STOMP n'est plus connecté, annulation de la récupération.");
          resolve(false);
          return;
        }
        
        // Send the request again
        service.stompClient.send('/app/chat.getRoom', {}, JSON.stringify({ 
          type: type,
          groupId: groupId
        }));
        
        // Reset recovery counter after 30 seconds of no errors
        setTimeout(() => {
          // If no new recovery attempts have been made in the last 30 seconds,
          // reset the counter for this room
          const lastAttemptTime = service.recoveryAttempts[roomKey]?.lastAttempt || 0;
          if (Date.now() - lastAttemptTime >= 30000) {
            if (service.recoveryAttempts[roomKey]) {
              console.log(`Réinitialisation du compteur de récupération pour le salon ${type}`);
              service.recoveryAttempts[roomKey].count = 0;
            }
          }
        }, 30000);
        
        resolve(true);
      } catch (e) {
        console.error('Erreur lors de la tentative de récupération:', e);
        resolve(false);
      }
    }, delay);
  });
}

/**
 * Formats a backend error message for display to the user
 * 
 * @param {Object|String} error - The error object or message
 * @param {String} language - The user's language preference
 * @returns {String} - A user-friendly error message
 */
export function formatChatErrorMessage(error, language = 'fr') {
  if (!error) return language === 'fr' ? 'Erreur inconnue' : 'Unknown error';
  
  // Extract the error message from various possible formats
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error || JSON.stringify(error));
  
  // Handle specific error types
  if (isHibernateLazyLoadingError(errorMessage)) {
    return language === 'fr' 
      ? 'Erreur de communication avec le serveur (session expirée). Réessai automatique en cours...'
      : 'Server communication error (session expired). Automatically retrying...';
  }
  
  if (isWebSocketConnectionError(errorMessage)) {
    return language === 'fr'
      ? 'Connexion au chat perdue. Tentative de reconnexion...'
      : 'Chat connection lost. Attempting to reconnect...';
  }
  
  // Handle authentication errors
  if (errorMessage.includes('401') || 
      errorMessage.includes('Unauthorized') || 
      errorMessage.includes('authentication')) {
    return language === 'fr'
      ? 'Session expirée. Veuillez vous reconnecter.'
      : 'Session expired. Please log in again.';
  }
  
  // Default error message
  return language === 'fr'
    ? `Erreur: ${errorMessage}`
    : `Error: ${errorMessage}`;
}

/**
 * Determines whether an error should be shown to the user or handled silently
 * 
 * @param {Object|String} error - The error object or message
 * @returns {Boolean} - True if the error should be shown to the user
 */
export function shouldShowErrorToUser(error) {
  // Don't show Hibernate lazy loading errors, as they'll be handled automatically
  if (isHibernateLazyLoadingError(error)) {
    return false;
  }
  
  // Don't show brief websocket connection issues that will auto-reconnect
  if (isWebSocketConnectionError(error) && error.code === 1006) {
    return false;
  }
  
  return true;
}

export default {
  isHibernateLazyLoadingError,
  isWebSocketConnectionError,
  isServerErrorMessage,
  recoverFromLazyLoadingError,
  formatChatErrorMessage,
  shouldShowErrorToUser
};
