// Chat error translations for Epic7
const chatErrorTranslations = {
  fr: {
    chatError: "Erreur de Chat",
    retryConnection: "Réessayer la connexion",
    connectionLost: "Connexion perdue",
    reconnecting: "Reconnexion en cours...",
    connectionRestored: "Connexion rétablie",
    chatSessionExpired: "Session de chat expirée",
    serverError: "Erreur serveur",
    websocketError: "Erreur de connexion WebSocket",
    websocketClosed: "Connexion WebSocket fermée",
    chatRoomNotFound: "Salon de chat introuvable",
    hibernateError: "Erreur d'initialisation de la session",
    chatReconnectFailed: "Échec de reconnexion au chat",
    pleaseRefresh: "Veuillez actualiser la page",
    messageNotDelivered: "Message non livré",
    cannotJoinRoom: "Impossible de rejoindre le salon",
    chatUnavailable: "Chat temporairement indisponible"
  },
  en: {
    chatError: "Chat Error",
    retryConnection: "Retry Connection",
    connectionLost: "Connection Lost",
    reconnecting: "Reconnecting...",
    connectionRestored: "Connection restored",
    chatSessionExpired: "Chat session expired",
    serverError: "Server error",
    websocketError: "WebSocket connection error",
    websocketClosed: "WebSocket connection closed",
    chatRoomNotFound: "Chat room not found",
    hibernateError: "Session initialization error",
    chatReconnectFailed: "Failed to reconnect to chat",
    pleaseRefresh: "Please refresh the page",
    messageNotDelivered: "Message not delivered",
    cannotJoinRoom: "Cannot join chat room",
    chatUnavailable: "Chat temporarily unavailable"
  }
};

// Function to merge these translations into the main translation file
export const mergeChatTranslations = (translations) => {
  if (!translations || typeof translations !== 'object') {
    console.error('Invalid translations object');
    return translations;
  }
  
  // Merge chat error translations into the main translations object
  for (const lang of Object.keys(translations)) {
    if (chatErrorTranslations[lang]) {
      translations[lang] = {
        ...translations[lang],
        ...chatErrorTranslations[lang]
      };
    }
  }
  
  return translations;
};

export default chatErrorTranslations;
