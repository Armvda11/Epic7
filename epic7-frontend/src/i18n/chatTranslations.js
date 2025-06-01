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
    chatUnavailable: "Chat temporairement indisponible",
    unknownDate: "Date inconnue",
    unknownTime: "Heure inconnue",
    unknownUser: "Utilisateur inconnu",
    typeMessage: "Tapez un message...",
    isTyping: "est en train d'écrire",
    peopleTyping: "personnes écrivent",
    deleteMessage: "Supprimer ce message",
    adminDeleteMessage: "Admin : Supprimer ce message",
    remove: "Supprimer",
    retrying: "Tentative de reconnexion...",
    retryCountdown: "Nouvelle tentative dans",
    seconds: "secondes",
    retryAttempt: "Tentative",
    retryNow: "Réessayer maintenant",
    startConversation: "Démarrer une conversation",
    noDescription: "Pas de description"
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
    chatUnavailable: "Chat temporarily unavailable",
    unknownDate: "Unknown date",
    unknownTime: "Unknown time",
    unknownUser: "Unknown user",
    typeMessage: "Type a message...",
    isTyping: "is typing",
    peopleTyping: "people are typing",
    deleteMessage: "Delete this message",
    adminDeleteMessage: "Admin: Delete this message",
    remove: "Remove",
    retrying: "Attempting to reconnect...",
    retryCountdown: "Retrying in",
    seconds: "seconds",
    retryAttempt: "Retry attempt",
    retryNow: "Retry Now",
    startConversation: "Start a conversation",
    noDescription: "No description"
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
