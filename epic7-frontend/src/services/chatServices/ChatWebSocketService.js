// Service WebSocket pour les discussions en temps réel
import axios from '../../api/axiosInstance';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { isHibernateLazyLoadingError, isServerErrorMessage } from './chatErrorUtils';
import { recoverFromHibernateError, getRecoveryDelay, resetRecoveryAttempts } from './chatRecoveryUtils';
import { getUserId } from '../authService';

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
    this.roomInfo = {}; // Store room information including numeric IDs
    
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

      // Prepare WebSocket URL with user ID as a query parameter
      const userId = getUserId();
      let wsUrl = sockJsUrl;
      
      if (userId) {
        // Add userId as a query parameter instead of a header to avoid CORS issues
        console.log('Adding user ID as query parameter:', userId);
        wsUrl = `${sockJsUrl}?userId=${encodeURIComponent(userId.toString())}`;
      } else {
        console.warn('No user ID available for WebSocket connection. User identity may not be properly tracked.');
      }

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
        const socket = new SockJS(wsUrl); // Use the URL with userId query parameter
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
          return Stomp.over(() => new SockJS(wsUrl)); // Use the URL with userId query parameter
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
    if (!this.connected || !this.stompClient) return;

    try {
      const subscription = this.stompClient.subscribe(
        `/user/queue/chat/error`,
        (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            
            // Check if this is a server shutdown notification
            if (this._handleServerShutdown(frame)) {
              return;
            }
            
            console.error('Erreur reçue du serveur:', payload);
            
            // Check for server shutdown indicators in error messages
            if (payload.code === 'SERVER_STOPPING' || 
                payload.message?.includes('server shutting down') ||
                payload.message?.includes('server shutdown')) {
              this._handleServerShutdown({body: JSON.stringify({...payload, type: 'SHUTDOWN'})});
              return;
            }
            
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
    if (!this.connected || !this.stompClient) return;

    try {
      // S'abonner au canal des messages personnels
      const messageSubscription = this.stompClient.subscribe(
        `/user/queue/chat/messages`,
        (frame) => {
          try {
            console.log('Raw message frame from personal queue:', frame);
            const payload = JSON.parse(frame.body);
            console.log('Parsed message payload from personal queue:', payload);
            
            // Check if this is a server shutdown notification
            if (this._handleServerShutdown(frame)) {
              return;
            }
            
            // Handle different message formats
            if (payload.status === 'SUCCESS' && payload.data && Array.isArray(payload.data)) {
              // This is a batch of messages
              console.log(`Received ${payload.data.length} messages from personal queue`);
              
              // Call onMessage for each message individually
              if (typeof this.callbacks.onMessage === 'function') {
                payload.data.forEach(message => {
                  console.log('Processing message:', message);
                  this.callbacks.onMessage(message, message.type || 'GLOBAL', message.groupId || null);
                });
              }
            } 
            // Handle single message format
            else if (payload.message) {
              console.log('Single message received:', payload.message);
              // Invoquer le callback onMessage s'il existe
              if (typeof this.callbacks.onMessage === 'function') {
                this.callbacks.onMessage(payload.message, payload.type, payload.groupId);
              }
            }
            else {
              console.warn('Unknown message format received:', payload);
            }
          } catch (error) {
            console.error('Erreur lors du parsing d\'un message:', error);
          }
        }
      );
      
      // S'abonner au canal des confirmations
      const confirmSubscription = this.stompClient.subscribe(
        `/user/queue/chat/confirm`,
        (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            
            // Check if this is a server shutdown notification
            if (this._handleServerShutdown(frame)) {
              return;
            }
            
            // Handle message confirmations
            if (payload.type === 'MESSAGE_SENT' && payload.status === 'SUCCESS') {
              // Invoquer le callback onMessageConfirm s'il existe
              if (typeof this.callbacks.onMessageConfirm === 'function') {
                this.callbacks.onMessageConfirm(payload);
              }
            } 
            else if (payload.type === 'MESSAGE_DELETED') {
              // Invoquer le callback onDeleteConfirm s'il existe
              if (typeof this.callbacks.onDeleteConfirm === 'function') {
                this.callbacks.onDeleteConfirm(payload);
              }
            }
          } catch (error) {
            console.error('Erreur lors du parsing d\'une confirmation:', error);
          }
        }
      );
      
      // S'abonner au canal des informations de salon
      const roomInfoSubscription = this.stompClient.subscribe(
        `/user/queue/chat/roomInfo`,
        (frame) => {
          try {
            const payload = JSON.parse(frame.body);
            
            // Check if this is a server shutdown notification
            if (this._handleServerShutdown(frame)) {
              return;
            }
            
            // Handle Hibernate lazy loading errors specifically
            if (payload.status === 'ERROR') {
              console.warn('Erreur de récupération des infos de salon:', payload);
              
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
                      code: 'HIBERNATE_ERROR_MAX_RETRY',
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
                    if (retryCount >= 5) {
                      console.error(`Échec de la récupération après ${retryCount} tentatives.`);
                      
                      if (typeof this.callbacks.onError === 'function') {
                        this.callbacks.onError({
                          code: 'HIBERNATE_ERROR_PERSISTENT',
                          message: 'Échec de la récupération après plusieurs tentatives. Veuillez rafraîchir la page.',
                          details: { reason, retryCount }
                        });
                      }
                    }
                  }
                });
                
                return;
              } else {
                // Other type of error
                console.error('Erreur serveur lors du chargement du salon:', payload);
                
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
              
              // Store the numeric room ID from server response for this room key
              if (payload.data && payload.data.id) {
                console.log(`Received numeric room ID for ${roomKey}: ${payload.data.id}`);
                
                // Store the numeric ID in the roomInfo map
                if (this.roomInfo[roomKey] === undefined) {
                  this.roomInfo[roomKey] = {};
                }
                this.roomInfo[roomKey].numericId = payload.data.id;
                this.roomInfo[roomKey].name = payload.data.name;
                this.roomInfo[roomKey].type = payload.data.type;
                this.roomInfo[roomKey].timestamp = new Date().getTime();
                
                // Also store the numeric ID with the subscription if it exists
                if (this.subscriptions[roomKey]) {
                  this.subscriptions[roomKey].numericId = payload.data.id;
                }
              }
            }
            
            // Invoquer le callback onRoomInfo s'il existe
            if (typeof this.callbacks.onRoomInfo === 'function') {
              this.callbacks.onRoomInfo(payload);
            }
          } catch (error) {
            console.error('Erreur lors du parsing des informations de salon:', error);
          }
        }
      );
      
      // S'abonner au canal de réception des messages
      const messagesReceivedSubscription = this.stompClient.subscribe(
        `/user/queue/chat/messagesReceived`,
        (frame) => {
          try {
            console.log('Raw message frame received:', frame);
            const payload = JSON.parse(frame.body);
            console.log('Parsed message payload:', payload);
            
            // Check if this is a server shutdown notification
            if (this._handleServerShutdown(frame)) {
              return;
            }
            
            // Handle different message formats that might come from the server
            if (payload.status === 'SUCCESS' && payload.data && Array.isArray(payload.data)) {
              // Log each message for debugging
              payload.data.forEach((msg, idx) => {
                console.log(`Message ${idx}:`, msg);
              });
            }
            
            // Invoquer le callback onMessagesReceived s'il existe
            if (typeof this.callbacks.onMessagesReceived === 'function') {
              this.callbacks.onMessagesReceived(payload);
            }
          } catch (error) {
            console.error('Erreur lors du parsing des messages reçus:', error);
          }
        }
      );
      
      // Stocker les abonnements
      this.subscriptions.personalChannels = {
        messages: messageSubscription,
        confirm: confirmSubscription,
        roomInfo: roomInfoSubscription,
        messagesReceived: messagesReceivedSubscription
      };
      
      console.log('Abonnement aux canaux personnels réussi');
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux canaux personnels:', error);
      
      // Notifier l'erreur
      if (typeof this.callbacks.onError === 'function') {
        this.callbacks.onError({
          code: 'SUBSCRIPTION_ERROR',
          message: 'Erreur lors de l\'abonnement aux canaux personnels',
          details: error
        });
      }
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
      
      // Check if we already have the numeric room ID
      const hasNumericId = this._hasValidRoomInfo(roomKey);
      
      if (!hasNumericId) {
        // We need to request room info first
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
      } else {
        console.log(`Already have room info for ${roomKey}, skipping room info request`);
      }

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
          typing: typingSubscription,
          numericId: null  // Will be populated when we receive room info
        };
        
        // Ajouter le salon à l'ensemble des salons actifs
        this.activeRooms.add(roomId);
      }
      
      // Get messages but only if we have the numeric room ID
      if (this._hasValidRoomInfo(roomId)) {
        const numericRoomId = this._getNumericRoomId(roomId);
        this._getMessagesWithRoomId(numericRoomId, 50);
      } else {
        // We'll get messages after receiving room info
        console.log(`Will get messages for ${roomId} after receiving room info`);
      }
      
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
    const roomKey = groupId ? `${type.toLowerCase()}.${groupId}` : 'global';
    const numericRoomId = this._getNumericRoomId(roomKey);
    
    if (!numericRoomId) {
      console.log(`No numeric room ID available for ${roomKey}. Will try to get room info first.`);
      // Use _ensureRoomInfo to get the room info if we don't have it yet
      this._ensureRoomInfo(roomKey)
        .then(roomId => {
          console.log(`Got numeric room ID ${roomId} for ${roomKey}, now getting messages`);
          this._getMessagesWithRoomId(roomId, limit);
        })
        .catch(error => {
          console.error(`Failed to get room info for ${roomKey}:`, error);
          // Try to recover by attempting to connect to the chat room again
          if (this.lastRoomRequest && this.lastRoomRequest.type) {
            console.log(`Attempting to reconnect to ${roomKey} after room info failure`);
            this._joinChat(this.lastRoomRequest.type, this.lastRoomRequest.groupId);
          }
        });
      return;
    }
    
    // We have a numeric room ID, so get messages directly
    this._getMessagesWithRoomId(numericRoomId, limit);
  }

  /**
   * Helper method to get messages with a specific room ID
   * @private
   * @param {number} roomId - Numeric room ID
   * @param {number} limit - Maximum number of messages to retrieve
   */
  _getMessagesWithRoomId(roomId, limit = 50) {
    try {
      console.log(`Getting messages for room ID ${roomId}`);
      // Envoyer la demande de messages avec l'ID numérique
      this.stompClient.send('/app/chat.getMessages', {}, JSON.stringify({
        roomId: roomId,
        limit: limit
      }));
    } catch (error) {
      console.error('Erreur lors de la demande de messages:', error);
    }
  }

  /**
   * Demander les messages récents d'un salon par son ID
   * @param {string} roomId - Identifiant logique du salon (e.g., 'global', 'guild.123')
   * @param {number} limit - Nombre maximum de messages à récupérer
   */
  getMessagesByRoomId(roomId, limit = 50) {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('Non connecté au WebSocket pour getMessagesByRoomId');
      return Promise.reject(new Error('Non connecté au WebSocket'));
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Get the numeric ID
        const numericRoomId = this._getNumericRoomId(roomId);
        
        if (!numericRoomId) {
          console.warn(`No numeric ID available for room ${roomId}, using original ID`);
        } else {
          console.log(`Using numeric ID ${numericRoomId} for room ${roomId}`);
        }
        
        // Envoyer la demande de messages avec l'ID numérique
        this.stompClient.send('/app/chat.getMessages', {}, JSON.stringify({
          roomId: numericRoomId || roomId, // Fallback to string ID if numeric not available
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
   * Get the numeric ID for a room
   * @private
   * @param {string} roomId - The logical room ID ('global', 'guild.123', etc.)
   * @returns {number|null} - The numeric room ID from the server, or null if not found
   */
  _getNumericRoomId(roomId) {
    // Case 1: If roomId is already a numeric ID, just return it
    if (!isNaN(roomId) && typeof roomId !== 'object') {
      return Number(roomId);
    }
    
    // Case 2: Check in roomInfo which is the most reliable source
    if (this.roomInfo[roomId] && this.roomInfo[roomId].numericId) {
      return this.roomInfo[roomId].numericId;
    }

    // Case 3: Check if we can find room by numeric ID in roomInfo values
    for (const key in this.roomInfo) {
      if (this.roomInfo[key].numericId === Number(roomId)) {
        return Number(roomId);
      }
    }
    
    // Case 4: Fallback to checking in subscriptions
    if (this.subscriptions[roomId] && this.subscriptions[roomId].numericId) {
      return this.subscriptions[roomId].numericId;
    }

    // For global chat room, if numeric ID is 1, return it directly (common default)
    if (roomId === 'global' || roomId === 'GLOBAL') {
      return 1; // Default global room ID is often 1
    }

    console.warn(`No numeric ID found for room ${roomId}`);
    return Number(roomId) || null; // Last resort: try to convert to number or return null
  }

  /**
   * Vérifie si nous avons des informations valides pour un salon
   * @param {string} roomId - Identifiant logique du salon
   * @returns {boolean} - True si nous avons des informations valides
   */
  _hasValidRoomInfo(roomId) {
    // Check if we have numeric ID in roomInfo
    if (this.roomInfo[roomId] && this.roomInfo[roomId].numericId) {
      return true;
    }

    // Check if we have numeric ID in subscriptions
    if (this.subscriptions[roomId] && this.subscriptions[roomId].numericId) {
      return true;
    }

    return false;
  }

  /**
   * Demande les informations d'un salon si nécessaire
   * @param {string} roomId - Identifiant logique du salon
   * @returns {Promise} - Promise résolue quand les informations sont disponibles
   */
  _ensureRoomInfo(roomId) {
    return new Promise((resolve, reject) => {
      if (this._hasValidRoomInfo(roomId)) {
        resolve(this._getNumericRoomId(roomId));
        return;
      }
      
      // We don't have valid room info, request it
      console.log(`Requesting room info for ${roomId}`);
      
      // Parse the room ID to get type and groupId
      let type, groupId;
      
      if (roomId === 'global') {
        type = 'GLOBAL';
        groupId = null;
      } else if (roomId.startsWith('guild.')) {
        type = 'GUILD';
        groupId = parseInt(roomId.split('.')[1], 10);
      } else if (roomId.startsWith('fight.')) {
        type = 'FIGHT';
        groupId = parseInt(roomId.split('.')[1], 10);
      } else {
        reject(new Error(`Invalid room ID format: ${roomId}`));
        return;
      }
      
      // Create a timeout to reject if we don't get room info
      const timeout = setTimeout(() => {
        // Restore the original callback
        this.callbacks.onRoomInfo = originalCallback;
        reject(new Error(`Timeout getting room info for ${roomId}`));
        console.error(`Failed to get room info for typing status in ${roomId}: TIMEOUT`);
      }, 5000);
      
      // Create a one-time listener for room info
      const originalCallback = this.callbacks.onRoomInfo;
      
      this.callbacks.onRoomInfo = (payload) => {
        // Call the original callback if it exists
        if (originalCallback) {
          originalCallback(payload);
        }
        
        // Check if this is the room info we're waiting for
        if (payload.data && 
            ((type === 'GLOBAL' && payload.data.type === 'GLOBAL') ||
            (type !== 'GLOBAL' && payload.data.type === type && payload.data.groupId === groupId))) {
          
          clearTimeout(timeout);
          
          // Store room info in roomInfo map
          if (this.roomInfo[roomId] === undefined) {
            this.roomInfo[roomId] = {};
          }
          this.roomInfo[roomId].numericId = payload.data.id;
          this.roomInfo[roomId].name = payload.data.name;
          this.roomInfo[roomId].type = payload.data.type;
          this.roomInfo[roomId].timestamp = new Date().getTime();
          
          // Also store with subscription if it exists
          if (this.subscriptions[roomId]) {
            this.subscriptions[roomId].numericId = payload.data.id;
          }
          
          // Restore the original callback
          this.callbacks.onRoomInfo = originalCallback;
          
          resolve(payload.data.id);
        }
      };
      
      // Request room info
      try {
        // Prepare the payload for the room request
        const payload = { type };
        
        if (groupId != null) {
          payload.groupId = groupId;
        }
        
        // Send the room request
        this.stompClient.send('/app/chat.getRoom', {}, JSON.stringify(payload));
        
        // Save the last room request
        this.lastRoomRequest = { type, groupId };
      } catch (error) {
        clearTimeout(timeout);
        
        // Restore the original callback
        this.callbacks.onRoomInfo = originalCallback;
        
        reject(error);
      }
    });
  }

  /**
   * Envoyer un message dans un salon
   * @param {string} roomId - Identifiant logique du salon (e.g., 'global', 'guild.123')
   * @param {string} content - Contenu du message
   * @returns {Promise} - Promise résolue quand le message est envoyé
   */
  sendMessage(roomId, content) {
    if (!this.stompClient || !this.stompClient.connected) {
      return Promise.reject(new Error('Non connecté au WebSocket pour sendMessage'));
    }
    
    return new Promise((resolve, reject) => {
      // Ensure we have room info before sending the message
      this._ensureRoomInfo(roomId)
        .then(numericRoomId => {
          try {
            // Préparer le payload avec l'ID numérique du salon
            const payload = {
              roomId: numericRoomId,
              content: content
            };
            
            // Always include the user ID in the payload for message ownership
            const userId = getUserId();
            if (userId) {
              payload.userId = userId.toString(); // Ensure it's a string (backend uses Long)
              payload.senderId = userId.toString(); // Add explicit senderId for consistency
              console.log(`Including user ID ${userId} in message payload`);
            } else {
              console.warn('No user ID available for message sending - attempting recovery');
              
              // Try to recover ID from other sources as a fallback
              try {
                const recoveredId = 
                  localStorage.getItem('userId') || 
                  localStorage.getItem('currentUserId') || 
                  localStorage.getItem('epic7UserId');
                  
                if (recoveredId) {
                  payload.userId = recoveredId.toString();
                  payload.senderId = recoveredId.toString();
                  console.log(`Using recovered ID for message: ${recoveredId}`);
                } else {
                  // Last resort: generate a temporary ID and warn about it
                  const tempId = `fallback-${Date.now()}`;
                  payload.userId = tempId;
                  payload.senderId = tempId;
                  console.warn(`Using temporary fallback ID: ${tempId}`);
                }
              } catch (e) {
                console.error('Error recovering user ID:', e);
              }
            }
            
            console.log(`Sending message to room ${roomId} with numeric ID ${numericRoomId}:`, payload);
            
            // Envoyer le message
            this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(payload));
            
            // La confirmation sera traitée par le callback onMessageConfirm
            resolve();
          } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
            reject(error);
          }
        })
        .catch(error => {
          console.error(`Failed to get room info for ${roomId}:`, error);
          reject(new Error(`Cannot send message - failed to get room info: ${error.message}`));
        });
    });
  }

  /**
   * Supprimer un message
   * @param {number} messageId - ID du message à supprimer
   * @param {string} roomId - Identifiant logique du salon (e.g., 'global', 'guild.123')
   * @returns {Promise} - Promise résolue quand le message est supprimé
   */
  deleteMessage(messageId, roomId) {
    if (!this.stompClient || !this.stompClient.connected) {
      return Promise.reject(new Error('Non connecté au WebSocket pour deleteMessage'));
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Get the numeric ID
        const numericRoomId = this._getNumericRoomId(roomId);
        
        if (!numericRoomId) {
          console.warn(`No numeric ID available for room ${roomId}, using original ID for message deletion`);
        } else {
          console.log(`Using numeric ID ${numericRoomId} for deleting message in room ${roomId}`);
        }
        
        // Préparer le payload avec l'ID numérique du salon
        const payload = {
          messageId: messageId,
          roomId: numericRoomId || roomId // Fallback to string ID if numeric not available
        };
        
        console.log(`Deleting message ${messageId} from room ${roomId} with numeric ID ${numericRoomId}`);
        
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
   * @param {string} roomId - Identifiant logique du salon (e.g., 'global', 'guild.123')
   * @param {boolean} isTyping - État de la frappe (true = en train de taper)
   */
  sendTypingStatus(roomId, isTyping) {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error('Non connecté au WebSocket pour sendTypingStatus');
      return;
    }
    
    // Ensure we have room info before sending the typing status
    this._ensureRoomInfo(roomId)
      .then(numericRoomId => {
        try {
          // Préparer le payload avec l'ID numérique du salon
          const payload = {
            roomId: numericRoomId,
            typing: isTyping
          };
          
          console.log(`Sending typing status for room ${roomId} with numeric ID ${numericRoomId}:`, payload);
          
          // Envoyer la notification
          this.stompClient.send('/app/chat.typing', {}, JSON.stringify(payload));
        } catch (error) {
          console.error('Erreur lors de l\'envoi de la notification de frappe:', error);
        }
      })
      .catch(error => {
        console.error(`Failed to get room info for typing status in ${roomId}:`, error);
        // No need to recover here as typing is not critical
      });
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
    
    // Clear room info storage
    this.roomInfo = {};
    
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

  /**
   * Détecte et gère une fermeture propre initiée par le serveur
   * @param {Object} frame - Trame STOMP contenant le message de fermeture
   * @private
   */
  /**
   * Handles server shutdown notifications
   * Only logs a warning when an actual shutdown is detected
   * @param {Object} frame - The message frame
   * @returns {boolean} - true if this was a shutdown message, false otherwise
   */
  _handleServerShutdown(frame) {
    try {
      // Parse the message if needed
      const payload = typeof frame.body === 'string' ? JSON.parse(frame.body) : frame.body;
      
      // If this is a clean shutdown message, handle it gracefully
      if (payload && (
          payload.type === 'SHUTDOWN' || 
          payload.type === 'SERVER_STOPPING' ||
          (payload.message && typeof payload.message === 'string' && payload.message.includes('shutdown'))
      )) {
        console.warn('Server-initiated shutdown detected:', payload);
        console.log('Processing clean server shutdown...');
        
        // Clear all room subscriptions - the server is going down
        this.activeRooms.clear();
        
        // Notify any listeners about this event
        if (typeof this.callbacks.onServerShutdown === 'function') {
          this.callbacks.onServerShutdown(payload);
        }
        
        // Disconnect gracefully without aggressive reconnection attempts
        this.disconnect();
        
        // Dispatch a custom event to alert other components
        const shutdownEvent = new CustomEvent('serverShutdown', { 
          detail: { 
            reason: payload.message || 'Server is shutting down',
            timestamp: new Date().toISOString(),
            reconnectAfter: payload.reconnectAfter || 30000 // Default 30 seconds
          } 
        });
        window.dispatchEvent(shutdownEvent);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error processing potential shutdown message:', error);
      return false;
    }
  }
}

// Exporter une instance singleton
export default new ChatWebSocketService();
