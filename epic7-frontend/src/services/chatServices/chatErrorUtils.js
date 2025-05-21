/**
 * Utility functions for handling chat-related errors
 */

/**
 * Checks if an error is a Hibernate LazyLoading error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a Hibernate LazyLoading error
 */
export const isHibernateLazyLoadingError = (error) => {
  if (!error) return false;
  
  // Check error message for Hibernate lazy loading exception patterns
  const message = error.message || '';
  return message.includes('LazyInitializationException') || 
         message.includes('failed to lazily initialize') ||
         message.includes('could not initialize proxy') ||
         message.includes('no Session');
};

/**
 * Checks if an error is related to WebSocket connection issues
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a WebSocket connection error
 */
export const isWebSocketConnectionError = (error) => {
  if (!error) return false;
  
  // Common WebSocket connection error patterns
  const message = error.message || '';
  const isConnectionError = 
    message.includes('Connection refused') ||
    message.includes('Failed to connect') || 
    message.includes('WebSocket connection failed') ||
    message.includes('socket closed') ||
    message.includes('timed out') ||
    error.code === 1000 || // Normal closure
    error.code === 1001 || // Going away
    error.code === 1006;   // Abnormal closure
    
  return isConnectionError;
};

/**
 * Checks if a message from the server indicates an error
 * @param {Object} message - The received message 
 * @returns {boolean} - True if the message indicates a server error
 */
export const isServerErrorMessage = (message) => {
  if (!message) return false;
  
  return (message.error || 
         (message.type && message.type === 'ERROR') ||
         (message.code && 
          (message.code.includes('ERROR') || 
           message.code.includes('FAILED') ||
           message.code.includes('DENIED'))));
};

/**
 * Formats an error message for display in the chat UI
 * @param {string|Error} error - The error object or message
 * @param {string} language - The user's language preference (e.g., 'en', 'fr')
 * @returns {string} - Formatted error message
 */
export const formatChatErrorMessage = (error, language = 'en') => {
  if (!error) return language === 'fr' ? 'Erreur inconnue' : 'Unknown error';
  
  // Convert error object to string if needed
  const errorMessage = typeof error === 'object' ? 
    (error.message || error.toString()) : 
    error.toString();
  
  // Check for common error patterns and provide user-friendly messages
  if (isWebSocketConnectionError(error) || 
      errorMessage.includes('WebSocket') || 
      errorMessage.includes('connect')) {
    return language === 'fr' ? 
      'Problème de connexion au serveur de chat. Veuillez vérifier votre connexion internet.' : 
      'Connection issue with the chat server. Please check your internet connection.';
  }
  
  if (isHibernateLazyLoadingError(error)) {
    return language === 'fr' ? 
      'Erreur de données sur le serveur. Veuillez rafraîchir la page.' : 
      'Server data error. Please refresh the page.';
  }
  
  if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
    return language === 'fr' ? 
      'Erreur d\'authentification. Veuillez vous reconnecter.' : 
      'Authentication error. Please log in again.';
  }
  
  // Default error message with original error details
  return language === 'fr' ? 
    `Erreur: ${errorMessage}` : 
    `Error: ${errorMessage}`;
};
