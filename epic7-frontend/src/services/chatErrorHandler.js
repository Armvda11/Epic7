/**
 * Utilitaire pour gérer les erreurs spécifiques du chat
 */

/**
 * Vérifie si l'erreur est une erreur Hibernate de lazy loading
 * @param {Object} error - L'objet d'erreur à vérifier
 * @returns {boolean} - true si c'est une erreur de lazy loading
 */
export const isLazyLoadingError = (error) => {
  if (!error || !error.message) return false;
  
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error || JSON.stringify(error));
    
  return errorMessage.includes('failed to lazily initialize a collection') ||
         errorMessage.includes('LazyInitializationException') ||
         errorMessage.includes('could not initialize proxy - no Session') ||
         errorMessage.includes('collection of role: com.epic7.model.ChatRoom.userIds');
};

/**
 * Vérifie si l'erreur est une erreur de session expirée
 * @param {Object} error - L'objet d'erreur à vérifier
 * @returns {boolean} - true si c'est une erreur de session expirée
 */
export const isSessionExpiredError = (error) => {
  if (!error || !error.message) return false;
  return error.message.includes('expired') ||
         error.message.includes('invalid session');
};

/**
 * Vérifie si l'erreur est une erreur de connexion réseau
 * @param {Object} error - L'objet d'erreur à vérifier 
 * @returns {boolean} - true si c'est une erreur de connexion réseau
 */
export const isNetworkError = (error) => {
  if (!error || !error.message) return false;
  
  const errorMessage = typeof error === 'string' 
    ? error 
    : (error.message || error.error || JSON.stringify(error));
    
  return errorMessage.includes('network') ||
         errorMessage.includes('connection') ||
         errorMessage.includes('connected') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('WebSocket') ||
         (error.code && [1000, 1001, 1006, 1011, 1012, 1013].includes(error.code));
};

/**
 * Essaie de récupérer un ID de salle à partir d'une réponse d'erreur
 * (certaines erreurs contiennent toujours des informations utiles)
 * @param {Object} errorPayload - La réponse d'erreur
 * @returns {number|null} - L'ID de salle si disponible, sinon null
 */
export const extractRoomIdFromError = (errorPayload) => {
  try {
    if (errorPayload && errorPayload.data && errorPayload.data.roomId) {
      return errorPayload.data.roomId;
    }
    
    // Tenter d'extraire l'ID d'une chaîne d'erreur
    if (errorPayload && errorPayload.message) {
      const match = errorPayload.message.match(/roomId[:\s]+(\d+)/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error while extracting room ID from error:', e);
    return null;
  }
};

/**
 * Calcule le délai de nouvelle tentative avec recul exponentiel
 * @param {number} retryCount - Nombre de tentatives déjà effectuées
 * @param {number} baseDelay - Délai de base en ms (défaut: 1000ms)
 * @param {number} maxDelay - Délai maximum en ms (défaut: 15000ms)
 * @returns {number} - Délai en ms pour la prochaine tentative
 */
export const calculateBackoff = (retryCount, baseDelay = 1000, maxDelay = 15000) => {
  // Recul exponentiel: baseDelay * 2^retryCount (limité à maxDelay)
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
};

/**
 * Gère une erreur de chat et détermine l'action à prendre
 * @param {Object} error - L'erreur à gérer
 * @param {Function} reconnectCallback - Fonction à appeler pour se reconnecter
 * @param {Function} retryCallback - Fonction à appeler pour réessayer l'opération
 * @param {Object} state - État actuel des tentatives
 * @returns {Object} - Informations sur l'erreur et l'action recommandée
 */
export const handleChatError = (error, reconnectCallback, retryCallback, state = {}) => {
  const errorInfo = {
    error,
    shouldReconnect: false,
    shouldRetry: false,
    shouldIgnore: false,
    message: null,
    retryDelay: 1000
  };
  
  // Initialiser ou incrémenter le compteur de tentatives
  state.retryCount = (state.retryCount || 0) + 1;
  
  // Si c'est une erreur de lazy loading, on peut réessayer avec recul exponentiel
  if (isLazyLoadingError(error)) {
    // Circuit breaker: limite de tentatives (exactement 5 tentatives max)
    if (state.retryCount >= 5) {
      errorInfo.shouldRetry = false;
      errorInfo.shouldIgnore = false;
      errorInfo.message = "Échec persistant de chargement des données. Veuillez réessayer ultérieurement.";
      
      // Ajouter un verrou temporaire pour empêcher de nouvelles tentatives
      state.lockUntil = Date.now() + 30000; // Verrou de 30 secondes
      console.warn(`Circuit breaker activé pour les erreurs Hibernate. Verrouillé pendant 30s.`);
      
      return errorInfo;
    }
    
    // Vérifier s'il y a un verrou temporaire
    if (state.lockUntil && Date.now() < state.lockUntil) {
      errorInfo.shouldRetry = false;
      errorInfo.shouldIgnore = false;
      errorInfo.message = "Trop de tentatives échouées. Réessayez dans quelques minutes.";
      return errorInfo;
    }
    
    errorInfo.shouldRetry = true;
    errorInfo.shouldIgnore = state.retryCount <= 3; // N'afficher qu'après plusieurs échecs
    errorInfo.message = `Erreur temporaire de chargement de données, nouvel essai (${state.retryCount}/5)...`;
    
    // Calculer le délai avec recul exponentiel
    errorInfo.retryDelay = calculateBackoff(state.retryCount - 1);
    
    // Effectuer un retry automatique avec un délai progressif
    if (typeof retryCallback === 'function') {
      setTimeout(() => {
        // Double vérification avant de réessayer
        if (state.retryCount < 5) {
          retryCallback(error, state);
        }
      }, errorInfo.retryDelay);
    }
    
    return errorInfo;
  }
  
  // Si c'est une erreur de session expirée, on doit se reconnecter
  if (isSessionExpiredError(error)) {
    errorInfo.shouldReconnect = true;
    errorInfo.message = "Session expirée, reconnexion en cours...";
    
    // Effectuer une reconnexion automatique
    if (typeof reconnectCallback === 'function') {
      reconnectCallback(error);
    }
    
    return errorInfo;
  }
  
  // Si c'est une erreur réseau, on peut essayer de se reconnecter
  if (isNetworkError(error)) {
    // Circuit breaker: limite de tentatives de reconnexion
    if (state.retryCount > 3) {
      errorInfo.shouldReconnect = false;
      errorInfo.message = "Impossible de se reconnecter au serveur après plusieurs tentatives.";
      return errorInfo;
    }
    
    errorInfo.shouldReconnect = true;
    errorInfo.message = `Problème de connexion, tentative de reconnexion (${state.retryCount}/3)...`;
    
    // Calculer le délai avec recul exponentiel
    errorInfo.retryDelay = calculateBackoff(state.retryCount - 1);
    
    // Effectuer une reconnexion automatique avec délai
    if (typeof reconnectCallback === 'function') {
      setTimeout(() => {
        reconnectCallback(error);
      }, errorInfo.retryDelay);
    }
    
    return errorInfo;
  }
  
  // Erreur générique
  errorInfo.message = error.message || "Une erreur est survenue dans le chat";
  return errorInfo;
};

export default {
  isLazyLoadingError,
  isSessionExpiredError,
  isNetworkError,
  extractRoomIdFromError,
  calculateBackoff,
  handleChatError
};
