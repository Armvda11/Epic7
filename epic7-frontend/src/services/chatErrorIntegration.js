/**
 * Chat Error Integration Module
 * 
 * This module brings together all error handling utilities for the chat system
 * and provides a simple interface for error detection, recovery, and reporting.
 */

import { isHibernateLazyLoadingError, isWebSocketConnectionError, isServerErrorMessage } from './chatErrorUtils';
import { recoverFromHibernateError, resetRecoveryAttempts } from './chatRecoveryUtils';
import { handleChatError, formatChatErrorMessage } from './chatErrorHandler';

/**
 * Central error handling for chat system
 * Detects error type and routes to appropriate handler
 * 
 * @param {Object} error - The error to handle
 * @param {Object} service - The ChatWebSocketService instance
 * @param {Function} onUserNotify - Function to notify user of errors
 * @returns {Promise} - Resolves when handling is complete
 */
export async function handleChatSystemError(error, service, onUserNotify) {
  // Skip undefined errors
  if (!error) return false;

  console.log('Chat system handling error:', error);
  
  // Handle Hibernate LazyInitializationException
  if (isHibernateLazyLoadingError(error)) {
    // Determine room key
    let roomKey = 'unknown';
    if (service.lastRoomRequest) {
      const { type, groupId } = service.lastRoomRequest;
      roomKey = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    }
    
    // Check if we're already at max retries
    if (service.recoveryAttempts && 
        service.recoveryAttempts[roomKey] && 
        service.recoveryAttempts[roomKey].count >= 5) {
      
      console.warn(`Circuit breaker déjà activé pour ${roomKey}, aucune nouvelle tentative.`);
      onUserNotify({
        type: 'error',
        message: 'Échec persistant de chargement du salon. Veuillez réessayer plus tard.',
        code: 'HIBERNATE_ERROR_PERSISTENT',
        silent: false
      });
      return false;
    }
    
    // Only attempt recovery if we have connection and room info
    if (service.lastRoomRequest && service.connected && service.stompClient?.connected) {
      const result = await recoverFromHibernateError(service, error);
      
      // Only notify user on circuit breaker or persistent failures
      if (!result.success && (result.reason === 'circuit_breaker' || result.retryCount >= 4)) {
        onUserNotify({
          type: 'error',
          message: formatChatErrorMessage(error),
          code: 'HIBERNATE_ERROR_PERSISTENT',
          silent: false
        });
      }
      
      return result.success;
    }
  }
  
  // Handle WebSocket connection issues
  if (isWebSocketConnectionError(error)) {
    // Attempt reconnection if needed
    if (!service.connected || !service.stompClient?.connected) {
      try {
        await service.connect();
        return true;
      } catch (reconnectError) {
        onUserNotify({
          type: 'error',
          message: 'Impossible de se reconnecter au service de chat',
          code: 'WEBSOCKET_RECONNECT_FAILED',
          silent: false
        });
        return false;
      }
    }
  }
  
  // Handle general server errors
  if (isServerErrorMessage(error)) {
    onUserNotify({
      type: 'error',
      message: error.message || 'Erreur serveur',
      code: 'SERVER_ERROR',
      silent: false
    });
    return false;
  }
  
  // Default error handling
  onUserNotify({
    type: 'error',
    message: formatChatErrorMessage(error),
    code: 'UNKNOWN_ERROR',
    silent: false
  });
  
  return false;
}

/**
 * Determine if an error should be shown to the user
 * 
 * @param {Object} error - The error to evaluate
 * @param {Object} options - Options for evaluation
 * @returns {Boolean} - True if error should be shown to user
 */
export function shouldDisplayErrorToUser(error, options = {}) {
  const { retryCount = 0 } = options;
  
  // Hide Hibernate errors on first few attempts
  if (isHibernateLazyLoadingError(error) && retryCount < 3) {
    return false;
  }
  
  // Hide brief connection issues if they auto-recover
  if (isWebSocketConnectionError(error) && error.code === 1006) {
    return false;
  }
  
  return true;
}

/**
 * Format error for display in UI
 * 
 * @param {Object} error - Error to format
 * @param {String} language - User language preference
 * @returns {String} - Formatted error message
 */
export function formatErrorForDisplay(error, language = 'fr') {
  if (!error) {
    return language === 'fr' ? 'Erreur inconnue' : 'Unknown error';
  }
  
  // For hibernate errors
  if (isHibernateLazyLoadingError(error)) {
    return language === 'fr'
      ? 'Erreur temporaire de chargement de données. Réessai en cours...'
      : 'Temporary data loading error. Retrying...';
  }
  
  // For connection errors
  if (isWebSocketConnectionError(error)) {
    return language === 'fr'
      ? 'Connexion au chat perdue. Tentative de reconnexion...'
      : 'Chat connection lost. Attempting to reconnect...';
  }
  
  // For server errors
  if (isServerErrorMessage(error)) {
    const message = error.message || (typeof error === 'string' ? error : 'Server error');
    return message;
  }
  
  // Default
  return error.message || JSON.stringify(error);
}

export default {
  handleChatSystemError,
  shouldDisplayErrorToUser,
  formatErrorForDisplay,
  isHibernateLazyLoadingError,
  isWebSocketConnectionError
};
