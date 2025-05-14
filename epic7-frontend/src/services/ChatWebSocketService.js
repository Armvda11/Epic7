// Service WebSocket pour les discussions en temps réel - Fixed Version
import axios from '../api/axiosInstance';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { isHibernateLazyLoadingError, isServerErrorMessage } from './chatErrorUtils';
import { recoverFromHibernateError, getRecoveryDelay, resetRecoveryAttempts } from './chatRecoveryUtils';

class ChatWebSocketService {
constructor() {
    // Socket and client references
    this.socket = null;
    this.stompClient = null;
    
    // Connection state tracking
    this.connected = false;
    this.connectionState = 'disconnected'; // États possibles: 'disconnected', 'connecting', 'connected', 'reconnecting', 'disconnecting'
    this.connectPromise = null;
    
    // Reconnection configuration
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.initialReconnectDelay = 1000; // 1 seconde
    this.extendedReconnectDelay = 5000; // 5 secondes
    
    // Chat room tracking
    this.subscriptions = {};
    this.activeRooms = new Set(); // Ensemble des salons actifs
    this.lastRoomRequest = null; // Dernière demande de salon
    this.roomRequestHistory = {}; // Historique des demandes de salon
    
    // Error recovery
    this.recoveryAttempts = {}; // Compteur de tentatives de récupération par salon
    
    // Event callbacks
    this.callbacks = {};
}

/**
 * Connecte au serveur WebSocket avec authentification
 * @returns {Promise} - Promise résolue quand connecté, rejetée en cas d'erreur
 */
connect() {
    // If we already have a connection attempt in progress, return that promise
    if (this.connectPromise) {
      return this.connectPromise;
    }
    
    // Update connection state
    this.connectionState = this.connected ? 'reconnecting' : 'connecting';
    
    // Create a new connection promise
    this.connectPromise = new Promise((resolve, reject) => {
      if (this.connected && this.stompClient && this.stompClient.connected) {
        console.log('Chat WebSocket déjà connecté');
        this.connectionState = 'connected';
        resolve();
        return;
      }

      // Récupérer le token JWT depuis le localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('Pas de token JWT trouvé, connexion WebSocket impossible');
        console.error(error);
        this.connectionState = 'disconnected';
        reject(error);
        this.connectPromise = null;
        return;
      }

      // IMPORTANT: SockJS nécessite une URL HTTP/HTTPS, pas une URL WebSocket (ws/wss)
      let sockJsUrl = axios.defaults.baseURL || 'http://localhost:8080';
      
      // On s'assure que l'URL est HTTP/HTTPS et on enlève le préfixe /api
      sockJsUrl = sockJsUrl.replace(/^ws/, 'http').replace(/^wss/, 'https');
      if (sockJsUrl.includes('/api')) {
        sockJsUrl = sockJsUrl.replace('/api', '');
      }
      
      // Puis on ajoute le point d'entrée WebSocket
      sockJsUrl = sockJsUrl + '/ws';
      
      console.log(`Connexion Chat WebSocket via SockJS à: ${sockJsUrl}`);

      try {
        // Clean up any existing connections first
        if (this.stompClient && this.connected) {
          try {
            this.disconnect();
          } catch (e) {
            console.warn("Error during cleanup of existing connection:", e);
            // Continue anyway - we're trying to make a new connection
          }
        }
        
        // Créer une connexion SockJS
        const socket = new SockJS(sockJsUrl);
        this.socket = socket;
        
        // Monitor sockJS connection events
        socket.onclose = (event) => {
          console.warn(`SockJS connection closed with code: ${event.code}, reason: ${event.reason}`);
          
          // If this wasn't a client-initiated disconnect, trigger recovery
          if (this.connectionState !== 'disconnecting' && this.connected) {
            console.warn('Unexpected connection closure detected');
            
            // Dispatch a custom event for the reconnector to handle
            const errorEvent = new CustomEvent('websocketError', { 
              detail: {
                code: event.code,
                reason: event.reason || 'Connection closed unexpectedly',
                type: 'close'
              }
            });
            window.dispatchEvent(errorEvent);
            
            // Mark as disconnected to avoid confusion
            this.connected = false;
          }
        };

        socket.onerror = (error) => {
          console.error('SockJS connection error:', error);
          
          // Dispatch a custom event for the reconnector to handle
          const errorEvent = new CustomEvent('websocketError', { 
            detail: error
          });
          window.dispatchEvent(errorEvent);
        };
        
        // Créer un factory pour le client STOMP avec reconnexion automatique
        const stompFactory = () => {
          return Stomp.over(() => new SockJS(sockJsUrl));
        };
        
        // Initialiser le client STOMP avec le factory
        const stompClient = stompFactory();
        this.stompClient = stompClient;

        // Configurer le client STOMP
        stompClient.debug = process.env.NODE_ENV === 'production' ? () => {} : console.log;
        
        // Configure STOMP to handle errors better
        stompClient.onStompError = (frame) => {
          console.error('STOMP protocol error:', frame);
          
          // Dispatch a custom event for the reconnector to handle
          const errorEvent = new CustomEvent('websocketError', { 
            detail: {
              code: 'STOMP_ERROR',
              message: frame.headers?.message || 'STOMP protocol error',
              frame: frame
            }
          });
          window.dispatchEvent(errorEvent);
        };
        
        // En-têtes avec le token JWT
        const headers = {
          'Authorization': `Bearer ${token}`
        };
        
        // Connexion avec callbacks
        stompClient.connect(
          headers,
          // Callback de succès
          () => {
            console.log('Chat WebSocket connecté avec succès!');
            this.connectionState = 'connected';
            this.connected = true;
            this.reconnectAttempts = 0;
            
            // Ensure we're connected before subscribing - add a small delay
            setTimeout(() => {
              try {
                // S'abonner au canal d'erreurs personnelles
                this._subscribeToErrorChannel();
                
                // S'abonner aux canaux personnels pour les notifications
                this._subscribeToPersonalChannels();
                
                // Invoquer le callback onConnect s'il existe
                if (typeof this.callbacks.onConnect === 'function') {
                  this.callbacks.onConnect();
                }
                
                resolve();
              } catch (error) {
                console.error('Error in post-connection setup:', error);
                this.connectionState = 'disconnected';
                reject(error);
              }
              
              // Reset the connect promise so we can try again if needed
              this.connectPromise = null;
            }, 500);
          },
          // Callback d'erreur
          (error) => {
            console.error('Erreur de connexion Chat WebSocket:', error);
            this.connected = false;
            
            // Tenter une reconnexion automatique
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.connectionState = 'reconnecting';
              this.reconnectAttempts++;
              const currentAttempt = this.reconnectAttempts;
              
              // Utiliser un délai progressif: 1s pour les 2 premières tentatives, 5s pour les 3 suivantes
              const delay = currentAttempt <= 2 ? this.initialReconnectDelay : this.extendedReconnectDelay;
              
              console.log(`Tentative de reconnexion ${currentAttempt}/${this.maxReconnectAttempts} dans ${delay/1000}s...`);
              
              // Reset the connect promise so we can try again
              this.connectPromise = null;
              
              setTimeout(() => {
                // Double-vérifier l'état de connexion avant de tenter de se reconnecter
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                  this.connect().then(resolve).catch((e) => {
                    // Si nous atteignons la limite de tentatives pendant la reconnexion
                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                      this.connectionState = 'disconnected';
                      console.error('Nombre maximum de tentatives de reconnexion atteint');
                      if (typeof this.callbacks.onError === 'function') {
                        this.callbacks.onError({
                          code: 'MAX_RECONNECT_ATTEMPTS',
                          message: 'Connexion perdue. Veuillez rafraîchir la page.',
                          details: e
                        });
                      }
                    }
                    reject(e);
                  });
                } else {
                  this.connectionState = 'disconnected';
                  reject(new Error('Nombre maximum de tentatives de reconnexion atteint'));
                }
              }, delay);
            } else {
              console.error('Nombre maximum de tentatives de reconnexion atteint');
              this.connectionState = 'disconnected';
              
              // Invoquer le callback onError s'il existe
              if (typeof this.callbacks.onError === 'function') {
                this.callbacks.onError({
                  code: 'MAX_RECONNECT_ATTEMPTS',
                  message: 'Connexion perdue. Veuillez rafraîchir la page.',
                  details: error
                });
              }
              
              // Reset the connect promise
              this.connectPromise = null;
              reject(error);
            }
          }
        );
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la connexion WebSocket:', error);
        this.connectionState = 'disconnected';
        this.connectPromise = null;
        reject(error);
      }
    });
    
    return this.connectPromise;
}

/**
 * S'abonne au canal d'erreurs personnelles
 */
_subscribeToErrorChannel() {
    if (!this.stompClient || !this.connected) {
    console.warn("Cannot subscribe to error channel: no STOMP client or not connected");
    return;
    }
    
    try {
    // Verify client connection state
    if (!this.stompClient.connected) {
        console.warn("STOMP client not in connected state, delaying error channel subscription");
        setTimeout(() => this._subscribeToErrorChannel(), 500);
        return;
    }
    
    // S'abonner au canal d'erreurs personnelles
    const subscription = this.stompClient.subscribe(
        `/user/queue/errors`,
        (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.error('Erreur WebSocket:', payload);
            
            // Invoquer le callback onError s'il existe
            if (typeof this.callbacks.onError === 'function') {
            this.callbacks.onError(payload);
            }
        } catch (error) {
            console.error('Erreur lors du parsing d\'un message d\'erreur:', error);
        }
        }
    );
    
    this.subscriptions.errorChannel = subscription;
    } catch (error) {
    console.error('Erreur lors de l\'abonnement au canal d\'erreurs:', error);
    
    // On essaie de se reconnecter automatiquement
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Tentative de reconnexion automatique (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        // Utiliser un délai croissant
        const delay = this.reconnectAttempts === 1 ? this.initialReconnectDelay : this.extendedReconnectDelay;
        
        setTimeout(() => {
        // Only disconnect if we're still connected
        if (this.connected) {
            this.disconnect();
        }
        this.connect().catch(console.error);
        }, delay);
    }
    }
}

/**
 * S'abonne aux canaux personnels pour les notifications et confirmations
 */
_subscribeToPersonalChannels() {
    if (!this.stompClient || !this.connected) {
    console.warn("Cannot subscribe to personal channels: no STOMP client or not connected");
    return;
    }
    
    try {
    // Verify client connection state
    if (!this.stompClient.connected) {
        console.warn("STOMP client not in connected state, delaying personal channels subscription");
        setTimeout(() => this._subscribeToPersonalChannels(), 500);
        return;
    }
    
    // Canal pour les confirmations d'envoi de message
    const confirmSubscription = this.stompClient.subscribe(
        `/user/queue/chat/confirm`,
        (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.log('Confirmation envoi de message:', payload);
            
            // Invoquer le callback onMessageConfirm s'il existe
            if (typeof this.callbacks.onMessageConfirm === 'function') {
            this.callbacks.onMessageConfirm(payload);
            }
        } catch (error) {
            console.error('Erreur lors du parsing d\'une confirmation:', error);
        }
        }
    );
    
    // Canal pour les confirmations de suppression de message
    const deleteSubscription = this.stompClient.subscribe(
        `/user/queue/chat/delete`,
        (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.log('Confirmation suppression de message:', payload);
            
            // Invoquer le callback onDeleteConfirm s'il existe
            if (typeof this.callbacks.onDeleteConfirm === 'function') {
            this.callbacks.onDeleteConfirm(payload);
            }
        } catch (error) {
            console.error('Erreur lors du parsing d\'une confirmation de suppression:', error);
        }
        }
    );
    
    // Canal pour les informations de salon
    const roomsSubscription = this.stompClient.subscribe(
        `/user/queue/chat/rooms`,
        (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.log('Informations salon reçues:', payload);
            
            // Vérifier si c'est un message d'erreur du serveur
            if (isServerErrorMessage(payload)) {
            console.warn('Erreur serveur détectée dans la réponse de la salle:', payload);
            
            // Si c'est une erreur Hibernate de lazy loading, tenter une récupération
            if (isHibernateLazyLoadingError(payload.message)) {
                console.log('Erreur Hibernate lazy loading détectée...');
                
                // Generate room key for tracking retry attempts
                const roomKey = this.lastRoomRequest 
                  ? (this.lastRoomRequest.groupId 
                    ? `${this.lastRoomRequest.type.toLowerCase()}.${this.lastRoomRequest.groupId}` 
                    : 'global')
                  : 'unknown';
                
                // Check if room is already in circuit breaker state
                const recoveryData = this.recoveryAttempts && this.recoveryAttempts[roomKey];
                if (recoveryData && recoveryData.count >= 5) {
                  console.warn(`Circuit breaker déjà activé pour ${roomKey} après ${recoveryData.count} tentatives. Aucune nouvelle récupération.`);
                  
                  if (typeof this.callbacks.onError === 'function') {
                    this.callbacks.onError({
                      code: 'HIBERNATE_ERROR_PERSISTENT',
                      message: `Erreur persistante de chargement du salon de discussion. Veuillez réessayer ultérieurement.`,
                      details: payload
                    });
                  }
                  return;
                }
                
                // Attempt recovery with circuit breaker pattern
                recoverFromHibernateError(this, payload).then((result) => {
                  const { success, retryCount, reason } = result;
                  
                  if (success && retryCount < 5) {
                    console.log(`Récupération automatique initiée (tentative ${retryCount}/5)`);
                  } else {
                    console.warn(`Échec de la récupération automatique: ${reason || 'limite de tentatives atteinte'}`);
                    
                    // If recovery failed due to circuit breaker or max retries, notify user
                    if (reason === 'circuit_breaker' || retryCount >= 5) {
                      if (typeof this.callbacks.onError === 'function') {
                        this.callbacks.onError({
                          code: 'HIBERNATE_ERROR_MAX_RETRY',
                          message: `Échec de chargement du salon de discussion après plusieurs tentatives. Veuillez réessayer ultérieurement.`,
                          details: payload
                        });
                      }
                    }
                  }
                });
                return;
            } else {
                // For other server errors, notify user
                if (typeof this.callbacks.onError === 'function') {
                  this.callbacks.onError({
                    code: 'SERVER_ERROR',
                    message: payload.message || 'Erreur serveur lors du chargement du salon',
                    details: payload
                  });
                }
                return;
            }
            }
            
            // Reset recovery counter if we successfully got room info
            if (this.lastRoomRequest) {
              const roomKey = this.lastRoomRequest.groupId 
                ? `${this.lastRoomRequest.type.toLowerCase()}.${this.lastRoomRequest.groupId}` 
                : 'global';
              
              resetRecoveryAttempts(this, roomKey);
            }
            
            // Invoquer le callback onRoomInfo s'il existe
            if (typeof this.callbacks.onRoomInfo === 'function') {
              this.callbacks.onRoomInfo(payload);
            }
        } catch (error) {
            console.error('Erreur lors du parsing d\'informations salon:', error);
        }
        }
    );
    
    // Canal pour les messages
    const messagesSubscription = this.stompClient.subscribe(
        `/user/queue/chat/messages`,
        (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.log('Messages reçus:', payload);
            
            // Invoquer le callback onMessagesReceived s'il existe
            if (typeof this.callbacks.onMessagesReceived === 'function') {
            this.callbacks.onMessagesReceived(payload);
            }
        } catch (error) {
            console.error('Erreur lors du parsing de messages:', error);
        }
        }
    );
    
    this.subscriptions.confirmChannel = confirmSubscription;
    this.subscriptions.deleteChannel = deleteSubscription;
    this.subscriptions.roomsChannel = roomsSubscription;
    this.subscriptions.messagesChannel = messagesSubscription;
    } catch (error) {
    console.error('Erreur lors de l\'abonnement aux canaux personnels:', error);
    
    // On essaie de se reconnecter automatiquement en cas d'erreur
    setTimeout(() => {
        if (this.connected) {
        this._subscribeToPersonalChannels();
        }
    }, 1000);
    }
}

/**
 * Rejoindre un salon de chat global
 * @returns {Promise} - Promise résolue quand connecté au salon
 */
joinGlobalChat() {
    return this._joinChat('GLOBAL');
}

/**
 * Rejoindre un salon de chat de guilde
 * @param {number} guildId - ID de la guilde
 * @returns {Promise} - Promise résolue quand connecté au salon
 */
joinGuildChat(guildId) {
    return this._joinChat('GUILD', guildId);
}

/**
 * Rejoindre un salon de chat de duel/combat
 * @param {number} fightId - ID du combat
 * @returns {Promise} - Promise résolue quand connecté au salon
 */
joinFightChat(fightId) {
    return this._joinChat('FIGHT', fightId);
}

/**
 * Implémentation interne pour rejoindre un salon
 * @param {string} type - Type de salon (GLOBAL, GUILD, FIGHT)
 * @param {number} groupId - ID du groupe (guilde ou combat)
 * @returns {Promise} - Promise résolue quand connecté au salon
 */
_joinChat(type, groupId = null) {
    return new Promise((resolve, reject) => {
    if (!this.connected || !this.stompClient || !this.stompClient.connected) {
        this.connect()
        .then(() => this._doJoinChat(type, groupId, resolve, reject))
        .catch(error => {
            console.error('Échec de la connexion WebSocket avant de rejoindre le salon:', error);
            
            // Fournir une erreur plus explicite si nous avons atteint la limite de tentatives de reconnexion
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              reject(new Error('Impossible de rejoindre le salon: nombre maximum de tentatives de connexion atteint'));
              return;
            }
            
            reject(error);
        });
    } else {
        this._doJoinChat(type, groupId, resolve, reject);
    }
    });
}

/**
 * Implémentation interne pour rejoindre un salon
 */
_doJoinChat(type, groupId, resolve, reject) {
    if (!this.stompClient || !this.stompClient.connected) {
      reject(new Error('Non connecté au WebSocket'));
      return;
    }

    try {
      // Générer un identifiant de salon pour les vérifications d'état
      const roomKey = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
      
      // Vérifier si le circuit breaker est activé pour ce salon
      if (this.recoveryAttempts && 
          this.recoveryAttempts[roomKey] && 
          this.recoveryAttempts[roomKey].count >= 5) {
        
        console.warn(`Circuit breaker activé pour ${roomKey}. Verrouillage temporaire.`);
        
        // Attendre 30 secondes avant de réessayer
        setTimeout(() => {
          // Réinitialiser le compteur après 30 secondes
          resetRecoveryAttempts(this, roomKey);
          console.log(`Circuit breaker réinitialisé pour ${roomKey}`);
          
          // Réessayer de rejoindre le salon
          this._doJoinChat(type, groupId, resolve, reject);
        }, 30000);
        
        return;
      }
      
      // Préparer le payload pour la demande de salon
      const payload = {
        type: type
      };
      
      // Ajouter l'ID de groupe si nécessaire
      if (groupId != null) {
        payload.groupId = groupId;
      }
      
      console.log(`Demande de salon de type ${type}`, payload);

      // Envoyer la demande de salon
      this.stompClient.send('/app/chat.getRoom', {}, JSON.stringify(payload));
      
      // Sauvegarder la dernière demande de salon pour permettre une nouvelle tentative en cas d'erreur
      this.lastRoomRequest = { type, groupId };

      // Générer un identifiant de salon à partir du type et de l'ID de groupe
      const roomId = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    
    // S'abonner au salon approprié si ce n'est pas déjà fait
    if (!this.subscriptions[roomId]) {
        let destination;
        
        if (type === 'GLOBAL') {
        destination = '/topic/chat/global';
        } else if (type === 'GUILD') {
        destination = `/topic/chat/guild.${groupId}`;
        } else if (type === 'FIGHT') {
        destination = `/topic/chat/duel.${groupId}`;
        }
        
        // S'abonner aux messages du salon
        const messageSubscription = this.stompClient.subscribe(
        destination,
        (message) => {
            try {
            const payload = JSON.parse(message.body);
            console.log(`Message reçu dans ${type}:`, payload);
            
            // Invoquer le callback onMessage s'il existe
            if (typeof this.callbacks.onMessage === 'function') {
                this.callbacks.onMessage(payload, type, groupId);
            }
            } catch (error) {
            console.error('Erreur lors du parsing d\'un message:', error);
            }
        }
        );
        
        // S'abonner aux notifications de frappe
        const typingSubscription = this.stompClient.subscribe(
        `${destination}/typing`,
        (message) => {
            try {
            const payload = JSON.parse(message.body);
            console.log(`Notification de frappe dans ${type}:`, payload);
            
            // Invoquer le callback onTyping s'il existe
            if (typeof this.callbacks.onTyping === 'function') {
                this.callbacks.onTyping(payload, type, groupId);
            }
            } catch (error) {
            console.error('Erreur lors du parsing d\'une notification de frappe:', error);
            }
        }
        );
        
        // Stocker les abonnements pour pouvoir les annuler plus tard
        this.subscriptions[roomId] = {
        messages: messageSubscription,
        typing: typingSubscription
        };
        
        // Ajouter le salon à l'ensemble des salons actifs
        this.activeRooms.add(roomId);
    }
    
    // Demander les messages récents
    this.getMessages(type, groupId);
    
    resolve(roomId);
    } catch (error) {
    console.error(`Erreur lors de la connexion au salon ${type}:`, error);
    reject(error);
    }
}

/**
 * Demander les messages récents d'un salon
 * @param {string} type - Type de salon (GLOBAL, GUILD, FIGHT)
 * @param {number} groupId - ID du groupe (guilde ou combat)
 * @param {number} limit - Nombre maximum de messages à récupérer
 * @param {number} retryCount - Nombre de tentatives déjà effectuées (pour gestion interne)
 */
getMessages(type, groupId = null, limit = 50, retryCount = 0) {
    if (!this.stompClient || !this.stompClient.connected) {
    console.error('Non connecté au WebSocket pour getMessages');
    
    // Si nous ne sommes pas connectés, on se reconnecte puis réessaie
    if (retryCount < 2) {
        console.log(`Tentative de reconnexion automatique pour getMessages (${retryCount + 1}/2)...`);
        this.connect().then(() => {
        setTimeout(() => {
            this.getMessages(type, groupId, limit, retryCount + 1);
        }, 1000);
        }).catch(console.error);
    }
    return;
    }
    
    // Déterminer l'ID du salon
    let roomId;
    
    if (type === 'GLOBAL') {
    try {
        // Récupérer l'ID du salon global depuis le callback onRoomInfo
        // Pour l'instant, demander à nouveau les informations du salon
        this.stompClient.send('/app/chat.getRoom', {}, JSON.stringify({ type: 'GLOBAL' }));
        // Sauvegarder la dernière demande de salon
        this.lastRoomRequest = { type: 'GLOBAL', groupId: null };
    } catch (error) {
        console.error('Erreur lors de la demande de salon global:', error);
        // En cas d'erreur, on réessaie avec un délai
        if (retryCount < 2) {
        setTimeout(() => {
            this.getMessages(type, groupId, limit, retryCount + 1);
        }, 2000);
        }
    }
    return;
    } else {
    // Pour les autres types, nous avons besoin d'un groupId
    if (groupId == null) {
        console.error('groupId requis pour les salons non globaux');
        return;
    }
    
    try {
        // Récupérer l'ID du salon depuis le callback onRoomInfo
        // Pour l'instant, demander à nouveau les informations du salon
        this.stompClient.send('/app/chat.getRoom', {}, JSON.stringify({ 
        type: type,
        groupId: groupId
        }));
        // Sauvegarder la dernière demande de salon
        this.lastRoomRequest = { type, groupId };
    } catch (error) {
        console.error(`Erreur lors de la demande de salon ${type}:`, error);
        // En cas d'erreur, on réessaie avec un délai
        if (retryCount < 2) {
        setTimeout(() => {
            this.getMessages(type, groupId, limit, retryCount + 1);
        }, 2000);
        }
    }
    }
}

/**
 * Demander les messages récents d'un salon par son ID
 * @param {number} roomId - ID du salon
 * @param {number} limit - Nombre maximum de messages à récupérer
 */
getMessagesByRoomId(roomId, limit = 50) {
    if (!this.stompClient || !this.stompClient.connected) {
    console.error('Non connecté au WebSocket pour getMessagesByRoomId');
    return Promise.reject(new Error('Non connecté au WebSocket'));
    }
    
    return new Promise((resolve, reject) => {
    try {
        // Envoyer la demande de messages
        this.stompClient.send('/app/chat.getMessages', {}, JSON.stringify({
        roomId: roomId,
        limit: limit
        }));
        
        // La réponse sera traitée par le callback onMessagesReceived
        resolve();
    } catch (error) {
        console.error('Erreur lors de la demande de messages:', error);
        reject(error);
    }
    });
}

/**
 * Envoyer un message dans un salon
 * @param {number} roomId - ID du salon
 * @param {string} content - Contenu du message
 * @returns {Promise} - Promise résolue quand le message est envoyé
 */
sendMessage(roomId, content) {
    if (!this.stompClient || !this.stompClient.connected) {
    return Promise.reject(new Error('Non connecté au WebSocket pour sendMessage'));
    }
    
    return new Promise((resolve, reject) => {
    try {
        // Préparer le payload
        const payload = {
        roomId: roomId,
        content: content
        };
        
        // Envoyer le message
        this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(payload));
        
        // La confirmation sera traitée par le callback onMessageConfirm
        resolve();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        reject(error);
    }
    });
}

/**
 * Supprimer un message
 * @param {number} messageId - ID du message à supprimer
 * @param {number} roomId - ID du salon
 * @returns {Promise} - Promise résolue quand le message est supprimé
 */
deleteMessage(messageId, roomId) {
    if (!this.stompClient || !this.stompClient.connected) {
    return Promise.reject(new Error('Non connecté au WebSocket pour deleteMessage'));
    }
    
    return new Promise((resolve, reject) => {
    try {
        // Préparer le payload
        const payload = {
        messageId: messageId,
        roomId: roomId
        };
        
        // Envoyer la demande de suppression
        this.stompClient.send('/app/chat.deleteMessageDirect', {}, JSON.stringify(payload));
        
        // La confirmation sera traitée par le callback onDeleteConfirm
        resolve();
    } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        reject(error);
    }
    });
}

/**
 * Envoyer une notification de frappe
 * @param {number} roomId - ID du salon
 * @param {boolean} isTyping - État de la frappe (true = en train de taper)
 */
sendTypingStatus(roomId, isTyping) {
    if (!this.stompClient || !this.stompClient.connected) {
    console.error('Non connecté au WebSocket pour sendTypingStatus');
    return;
    }
    
    try {
    // Préparer le payload
    const payload = {
        roomId: roomId,
        typing: isTyping
    };
    
    // Envoyer la notification
    this.stompClient.send('/app/chat.typing', {}, JSON.stringify(payload));
    } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de frappe:', error);
    }
}

/**
 * Quitter un salon de chat
 * @param {string} type - Type de salon (GLOBAL, GUILD, FIGHT)
 * @param {number} groupId - ID du groupe (guilde ou combat)
 */
leaveChat(type, groupId = null) {
    // Générer un identifiant de salon à partir du type et de l'ID de groupe
    const roomId = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    
    // Vérifier si on est abonné à ce salon
    if (this.subscriptions[roomId]) {
    // Annuler les abonnements
    if (this.subscriptions[roomId].messages) {
        this.subscriptions[roomId].messages.unsubscribe();
    }
    
    if (this.subscriptions[roomId].typing) {
        this.subscriptions[roomId].typing.unsubscribe();
    }
    
    // Supprimer les abonnements
    delete this.subscriptions[roomId];
    
    // Retirer le salon de l'ensemble des salons actifs
    this.activeRooms.delete(roomId);
    
    console.log(`Déconnecté du salon ${type}`);
    }
}

/**
 * Enregistre un callback
 * @param {String} event - Nom de l'événement
 * @param {Function} callback - Fonction à appeler
 */
on(event, callback) {
    if (typeof callback === 'function') {
    this.callbacks[event] = callback;
    }
}

/**
 * Fonction de nettoyage pour désenregistrer un callback
 * @param {String} event - Nom de l'événement
 */
off(event) {
    if (this.callbacks[event]) {
    delete this.callbacks[event];
    }
}

/**
 * Se déconnecte du serveur WebSocket
 */
disconnect() {
    console.log('Déconnexion du Chat WebSocket en cours...');
    
    // Update connection state
    this.connectionState = 'disconnecting';
    
    // Reset the connect promise
    this.connectPromise = null;
    
    // Annuler tous les abonnements
    Object.keys(this.subscriptions).forEach(key => {
      const subscription = this.subscriptions[key];
      if (subscription) {
        if (typeof subscription.unsubscribe === 'function') {
          // C'est un abonnement simple
          try {
            subscription.unsubscribe();
            console.log(`Désabonnement de ${key} réussi`);
          } catch (e) {
            console.warn(`Erreur lors du désabonnement de ${key}:`, e);
          }
        } else {
          // C'est un groupe d'abonnements
          Object.entries(subscription).forEach(([subName, sub]) => {
            if (sub && typeof sub.unsubscribe === 'function') {
              try {
                sub.unsubscribe();
                console.log(`Désabonnement de ${key}.${subName} réussi`);
              } catch (e) {
                console.warn(`Erreur lors du désabonnement de ${key}.${subName}:`, e);
              }
            }
          });
        }
      }
    });
    
    // Vider les abonnements et les salons actifs
    this.subscriptions = {};
    this.activeRooms.clear();
    
    // Clear recovery attempts tracking
    this.recoveryAttempts = {};
    
    // Clear room request history
    this.roomRequestHistory = {};
    this.lastRoomRequest = null;
    
    // Se déconnecter du serveur
    if (this.stompClient) {
      if (this.stompClient.connected) {
        try {
          // Send a clean disconnect message if possible
          if (this.stompClient.send) {
            try {
              // Try to notify server we're disconnecting cleanly
              this.stompClient.send('/app/chat.disconnect', {}, JSON.stringify({
                reason: 'client_disconnect'
              }));
            } catch (e) {
              // Ignore errors when sending disconnect message
              console.warn('Unable to send disconnect message, connection might already be compromised');
            }
          }
          
          // Use a more robust disconnect with error handling
          this.stompClient.disconnect(() => {
            console.log('Déconnexion du client STOMP réussie');
            this._finalizeDisconnect();
          }, { force: true });
          
          // Set a timeout to force disconnect if the callback doesn't fire
          setTimeout(() => {
            if (this.connected) {
              console.warn('Forçage de la déconnexion après timeout');
              this._finalizeDisconnect();
            }
          }, 1000); // Reduced timeout to 1 second for faster cleanup
        } catch (error) {
          console.error('Erreur lors de la déconnexion STOMP:', error);
          this._finalizeDisconnect();
        }
      } else {
        // Already disconnected, just cleanup
        this._finalizeDisconnect();
      }
    } else {
      // No STOMP client, just cleanup
      this._finalizeDisconnect();
    }
}

/**
 * Finalise la déconnexion en réinitialisant les états
 * @private
 */
_finalizeDisconnect() {
    // Make sure we clean up the socket first
    if (this.socket) {
        try {
            // Manually clean up the socket
            this.socket.onclose = null;
            this.socket.onerror = null;
            this.socket.onopen = null;
            this.socket.close();
        } catch (e) {
            console.warn('Error during socket cleanup:', e);
        }
        this.socket = null;
    }
    
    // Clean up the STOMP client reference
    this.stompClient = null;
    
    // Update state tracking
    this.connected = false;
    this.connectionState = 'disconnected';
    this.connectPromise = null;
    
    // Notify any listeners that we've fully disconnected
    if (typeof this.callbacks.onDisconnect === 'function') {
        try {
            this.callbacks.onDisconnect();
        } catch (e) {
            console.error('Error in disconnect callback:', e);
        }
    }
    
    console.log('Déconnexion du Chat WebSocket terminée');
}
}

// Exporter une instance singleton
export default new ChatWebSocketService();
