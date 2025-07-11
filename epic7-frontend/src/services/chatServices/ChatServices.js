import chatWebSocketService from './ChatWebSocketService';
import chatSocketReconnector from './ChatSocketReconnector';
import { isHibernateLazyLoadingError, isWebSocketConnectionError } from './chatErrorUtils';

/**
 * Service pour gérer les fonctionnalités de chat
 */
class ChatService {
  constructor() {
    this.rooms = new Map(); // Stockage des salons par ID
    this.messages = new Map(); // Stockage des messages par salon
    this.typingUsers = new Map(); // Stockage des utilisateurs en train de taper par salon
    this.callbacks = {}; // Callbacks pour les événements
    
    // Listener pour les confirmations de suppression de message
    chatWebSocketService.on('onDeleteConfirm', (confirmation) => {
      console.log('Delete confirmation received:', confirmation);
      
      // Attempt to manually broadcast deletion if server might not be doing it
      // This is a fallback mechanism
      try {
        if (confirmation && confirmation.messageId && confirmation.roomId) {
          console.log('Attempting manual broadcast of deletion notification');
          
          // Get the room type and ID
          let roomType, roomDestination;
          const roomId = confirmation.roomId;
          
          if (typeof roomId === 'string') {
            if (roomId === 'global') {
              roomType = 'GLOBAL';
              roomDestination = '/topic/chat/global';
            } else if (roomId.startsWith('guild.')) {
              roomType = 'GUILD';
              const guildId = roomId.split('.')[1];
              roomDestination = `/topic/chat/guild.${guildId}`;
            } else if (roomId.startsWith('fight.')) {
              roomType = 'FIGHT';
              const fightId = roomId.split('.')[1];
              roomDestination = `/topic/chat/duel.${fightId}`;
            }
          } else {
            // Numeric ID, assume global chat for simplicity
            roomType = 'GLOBAL';
            roomDestination = '/topic/chat/global';
          }
          
          // Try to broadcast via different notification channels
          if (roomDestination) {
            // First try the deletions endpoint
            try {
              chatWebSocketService.stompClient.send(`${roomDestination}/deletions`, {}, JSON.stringify({
                type: 'deletion', // Ensure type is set for frontend filtering
                messageId: confirmation.messageId,
                roomId: roomId,
                timestamp: new Date().toISOString()
              }));
              console.log(`Sent deletion notification to ${roomDestination}/deletions`);
            } catch (e) {
              console.warn(`Failed to send to ${roomDestination}/deletions:`, e);
            }
            
            // Then try the deleted endpoint
            try {
              chatWebSocketService.stompClient.send(`${roomDestination}/deleted`, {}, JSON.stringify({
                type: 'deletion', // Ensure type is set for frontend filtering
                messageId: confirmation.messageId,
                roomId: roomId,
                timestamp: new Date().toISOString()
              }));
              console.log(`Sent deletion notification to ${roomDestination}/deleted`);
            } catch (e) {
              console.warn(`Failed to send to ${roomDestination}/deleted:`, e);
            }
            
            // Finally try the main channel
            try {
              chatWebSocketService.stompClient.send(roomDestination, {}, JSON.stringify({
                type: 'deletion', // Ensure type is set for frontend filtering
                messageId: confirmation.messageId,
                roomId: roomId,
                timestamp: new Date().toISOString()
              }));
              console.log(`Sent deletion notification to ${roomDestination} main channel`);
            } catch (e) {
              console.warn(`Failed to send to ${roomDestination}:`, e);
            }
          }
        }
      } catch (e) {
        console.warn('Failed during manual broadcast attempt:', e);
      }
      
      if (typeof this.callbacks.onDeleteConfirm === 'function') {
        this.callbacks.onDeleteConfirm(confirmation);
      }
    });
    // this.callbacks is already initialized at the beginning of constructor
    this.initialized = false;
    this.currentUser = null;
    
    // Initialiser les abonnements aux événements WebSocket
    this._initializeWebSocketListeners();
  }

  /**
   * Initialise le service de chat
   * @param {Object} user - L'utilisateur connecté
   * @returns {Promise} - Promise résolue quand initialisé
   */
  initialize(user) {
    return new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve();
        return;
      }
      
      // Validate user object and add logging
      if (!user) {
        console.error('No user provided to ChatService.initialize()');
        reject(new Error('User object is required'));
        return;
      }
      
      // Log user object for debugging
      console.log('ChatService initializing with user:', {
        id: user.id,
        hasEmail: !!user.email,
        idType: typeof user.id,
        isFallback: user.id?.toString().startsWith('fallback-') || false
      });
      
      this.currentUser = user;
      
      // Initialize the reconnector with a callback to handle reconnections
      chatSocketReconnector.init(() => {
        console.log('Reconnector triggered a reconnection');
        
        // Don't attempt reconnection if server shutdown is in progress
        if (this._serverShutdownInProgress) {
          console.log('Reconnection attempt suppressed - server shutdown in progress');
          return;
        }
        
        // Try to re-establish the connection
        if (this.currentUser) {
          // Set a flag to indicate we're in a reconnection process
          this._isReconnecting = true;
          
          // Update UI if needed
          if (typeof this.callbacks.onReconnecting === 'function') {
            this.callbacks.onReconnecting();
          }
          
          chatWebSocketService.connect()
            .then(() => {
              console.log('Reconnection successful');
              
              // Re-join any active rooms
              this._rejoinActiveRooms();
              
              // Reset the reconnecting flag
              this._isReconnecting = false;
              
              // Notify that reconnection was successful
              if (typeof this.callbacks.onReconnected === 'function') {
                this.callbacks.onReconnected();
              }
            })
            .catch(error => {
              console.error('Reconnection failed:', error);
              
              // Reset the reconnecting flag
              this._isReconnecting = false;
              
              // Update UI for reconnection failure
              if (typeof this.callbacks.onReconnectFailed === 'function') {
                this.callbacks.onReconnectFailed(error);
              }
              
              // Dispatch a global error event
              const errorEvent = new CustomEvent('chatError', { detail: error });
              window.dispatchEvent(errorEvent);
            });
        }
      });
      
      // Listen for websocket reconnect failures
      window.addEventListener('websocketReconnectFailed', this._handleReconnectFailed);
      
      // Listen for websocket errors to provide user feedback
      window.addEventListener('websocketError', this._handleWebSocketError);
      
      // Listen for server shutdown events
      window.addEventListener('serverShutdown', this._handleServerShutdown);
      
      // Connecter au WebSocket
      chatWebSocketService.connect()
        .then(() => {
          this.initialized = true;
          
          // Reset the reconnector counter on successful connection
          chatSocketReconnector.resetRetryCount();
          
          // Invoquer le callback onInitialized s'il existe
          if (typeof this.callbacks.onInitialized === 'function') {
            this.callbacks.onInitialized();
          }
          
          resolve();
        })
        .catch(error => {
          console.error('Initialization failed:', error);
          
          // Provide a more user-friendly error
          const userError = {
            ...error,
            userMessage: 'Impossible de se connecter au service de discussion. Veuillez vérifier votre connexion internet et réessayer.'
          };
          
          if (typeof this.callbacks.onError === 'function') {
            this.callbacks.onError(userError);
          }
          
          reject(userError);
        });
    });
  }

  /**
   * Handle reconnection failures
   * @param {CustomEvent} event - The reconnection failed event
   */
  _handleReconnectFailed = (event) => {
    console.error('WebSocket reconnection permanently failed', event.detail);
    
    // Notify the user that reconnection failed
    if (typeof this.callbacks.onError === 'function') {
      this.callbacks.onError({
        message: `La reconnexion a échoué après ${event.detail.retries} tentatives. Veuillez actualiser la page.`
      });
    }
    
    // Dispatch a global error event
    const errorEvent = new CustomEvent('chatError', { 
      detail: {
        message: `Maximum reconnection attempts reached (${event.detail.retries})`,
        permanent: true
      }
    });
    window.dispatchEvent(errorEvent);
  }
  
  /**
   * Handle WebSocket errors
   * @param {CustomEvent} event - The error event
   */
  _handleWebSocketError = (event) => {
    const error = event?.detail;
    console.warn('WebSocket error detected in ChatService:', error);
    
    // Only process if we're initialized
    if (!this.initialized) return;
    
    // Don't show all errors to the user, some will be handled automatically
    if (error) {
      // Handle connection closure errors differently
      if (error.type === 'close' || error.code === 1006 || 
          (error.message && (error.message.includes('closed') || error.message.includes('Lost connection')))) {
        
        console.log('Connection closure detected, reconnector will handle this');
        
        // Show a temporary status message if this wasn't during a reconnection
        if (!this._isReconnecting && typeof this.callbacks.onConnectionIssue === 'function') {
          this.callbacks.onConnectionIssue({
            type: 'connection_lost',
            message: 'Connexion au chat perdue. Tentative de reconnexion en cours...',
            recoverable: true
          });
        }
        
        return;
      }
      
      // Handle server errors that should be shown to the user
      if (error.code === 'SERVER_ERROR' || error.code === 'HIBERNATE_ERROR_PERSISTENT') {
        if (typeof this.callbacks.onError === 'function') {
          this.callbacks.onError({
            code: error.code,
            message: error.message || 'Erreur serveur. Veuillez réessayer ultérieurement.',
            details: error
          });
        }
      }
    }
  }

  /**
   * Handle server shutdown event
   * @param {CustomEvent} event - The server shutdown event
   */
  _handleServerShutdown = (event) => {
    console.warn('Server shutdown detected', event.detail);
    
    // Extract shutdown details
    const { reason, timestamp, reconnectAfter } = event.detail;
    const reconnectTime = reconnectAfter || 30000; // Default to 30 seconds
    
    // Notify users about the shutdown
    if (typeof this.callbacks.onServerShutdown === 'function') {
      this.callbacks.onServerShutdown({
        message: `Le serveur est en cours de maintenance. Reconnexion automatique dans ${Math.ceil(reconnectTime/1000)} secondes.`,
        reason,
        timestamp,
        reconnectAfter: reconnectTime
      });
    }
    
    // Cleanup existing connection
    chatWebSocketService.disconnect();
    
    // Set a flag so we don't try to reconnect immediately
    this._serverShutdownInProgress = true;
    
    // Schedule a reconnection attempt after the specified time
    console.log(`Scheduling reconnection in ${reconnectTime/1000} seconds...`);
    this._shutdownReconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect after server shutdown');
      this._serverShutdownInProgress = false;
      
      // Only attempt reconnection if we're still initialized
      if (this.initialized && this.currentUser) {
        // Inform user we're trying to reconnect
        if (typeof this.callbacks.onReconnecting === 'function') {
          this.callbacks.onReconnecting();
        }
        
        // Try to reconnect
        chatWebSocketService.connect()
          .then(() => {
            console.log('Reconnection after server shutdown successful');
            
            // Reset the reconnector
            chatSocketReconnector.resetRetryCount();
            
            // Re-join any active rooms
            this._rejoinActiveRooms();
            
            // Notify about successful reconnection
            if (typeof this.callbacks.onReconnected === 'function') {
              this.callbacks.onReconnected();
            }
          })
          .catch(error => {
            console.error('Reconnection after server shutdown failed:', error);
            
            // Notify about the failure
            if (typeof this.callbacks.onError === 'function') {
              this.callbacks.onError({
                code: 'RECONNECT_AFTER_SHUTDOWN_FAILED',
                message: 'La reconnexion a échoué après la maintenance du serveur. Veuillez actualiser la page.',
                details: error
              });
            }
          });
      }
    }, reconnectTime);
  }

  /**
   * Rejoins any active chat rooms after a reconnection
   */
  _rejoinActiveRooms() {
    // Get all the active rooms from the WebSocket service
    const activeRooms = Array.from(chatWebSocketService.activeRooms);
    
    if (activeRooms.length === 0) {
      console.log('No active rooms to rejoin');
      return;
    }
    
    console.log(`Rejoining ${activeRooms.length} active rooms:`, activeRooms);
    
    // Track successful rejoins for reporting
    let successCount = 0;
    let failCount = 0;
    const roomPromises = [];
    
    activeRooms.forEach(roomId => {
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
      }
      
      if (type) {
        console.log(`Rejoining ${type} room with groupId:`, groupId);
        
        // Create a promise for each room join attempt
        const roomPromise = chatWebSocketService._joinChat(type, groupId)
          .then(() => {
            console.log(`Successfully rejoined ${type} room`);
            successCount++;
            
            // Update the message list for this room
            chatWebSocketService.getMessages(type, groupId);
            
            // Notify listeners about the rejoined room
            if (typeof this.callbacks.onRoomJoined === 'function') {
              this.callbacks.onRoomJoined(roomId);
            }
            
            return { roomId, success: true };
          })
          .catch(error => {
            console.error(`Failed to rejoin ${type} room:`, error);
            failCount++;
            return { roomId, success: false, error };
          });
          
        roomPromises.push(roomPromise);
      }
    });
    
    // Handle the overall rejoin process results
    Promise.allSettled(roomPromises).then(results => {
      console.log(`Room rejoin process complete: ${successCount} succeeded, ${failCount} failed`);
      
      // Notify about overall rejoin status
      if (typeof this.callbacks.onRoomsRejoined === 'function') {
        this.callbacks.onRoomsRejoined({
          total: activeRooms.length,
          success: successCount,
          failed: failCount
        });
      }
      
      // If we had failures but some successes, we can consider it a partial recovery
      if (failCount > 0 && successCount > 0) {
        console.log('Partial recovery achieved - some rooms were successfully rejoined');
      } 
      // If everything failed, we might want to notify the user
      else if (failCount > 0 && successCount === 0) {
        console.error('Failed to rejoin any rooms - connection may be compromised');
        
        // Notify about the failure
        if (typeof this.callbacks.onError === 'function') {
          this.callbacks.onError({
            code: 'REJOIN_COMPLETE_FAILURE',
            message: 'Impossible de rejoindre les salons de discussion. La connexion pourrait être compromise.',
            rooms: activeRooms
          });
        }
      }
    });
  }

  /**
   * Initialise les écouteurs d'événements WebSocket
   */
  _initializeWebSocketListeners() {
    // Événement: Connexion au WebSocket réussie
    chatWebSocketService.on('onConnect', () => {
      console.log('WebSocket connecté avec succès');
      
      // Invoquer le callback onConnected s'il existe
      if (typeof this.callbacks.onConnected === 'function') {
        this.callbacks.onConnected();
      }
    });
    
    // Add dedicated listener for message deletion events
    chatWebSocketService.on('onMessageDeleted', (deletionData, roomId) => {
      console.log('Message deletion notification received in service:', deletionData);
      
      // Process local cache update
      if (deletionData) {
        // Extract message ID from various possible formats
        const messageId = deletionData.messageId || 
                        deletionData.deletedMessageId || 
                        (deletionData.message && deletionData.message.id) ||
                        deletionData.id;
        
        if (messageId && roomId && this.messages.has(roomId)) {
          // Remove from local cache
          const messages = this.messages.get(roomId);
          const updatedMessages = messages.filter(msg => 
            !msg || 
            msg.id !== messageId && 
            msg.id?.toString() !== messageId.toString()
          );
          
          // Update the cache
          this.messages.set(roomId, updatedMessages);
          console.log(`Removed message ${messageId} from local cache for room ${roomId}`);
        }
      }
      
      // Forward to context via callback
      if (typeof this.callbacks.onMessageDeleted === 'function') {
        this.callbacks.onMessageDeleted(deletionData);
      }
    });
    
    // Événement: Erreur WebSocket
    chatWebSocketService.on('onError', (error) => {
      console.error('Erreur WebSocket:', error);
      
      // Check for server-side Hibernate errors
      if (isHibernateLazyLoadingError(error)) {
        console.warn('Detected Hibernate lazy initialization error, triggering WebSocket recovery');
        
        // Dispatch a custom event for the reconnector to handle
        const errorEvent = new CustomEvent('websocketError', { detail: error });
        window.dispatchEvent(errorEvent);
        
        // Try to rejoin any active rooms automatically after a small delay
        setTimeout(() => {
          if (this.connected) {
            this._rejoinActiveRooms();
          }
        }, 2000);
      }
      // Check for connection errors
      else if (isWebSocketConnectionError(error)) {
        console.warn('Detected WebSocket connection error, triggering reconnection');
        
        // Dispatch a custom event for the reconnector to handle
        const errorEvent = new CustomEvent('websocketError', { detail: error });
        window.dispatchEvent(errorEvent);
      }
      
      // Invoquer le callback onError s'il existe
      if (typeof this.callbacks.onError === 'function') {
        this.callbacks.onError(error);
      }
    });
    
    // Événement: Réception d'un message
    chatWebSocketService.on('onMessage', (message, type, groupId) => {
      // Ajouter le message au stockage local
      this._addMessage(message);

      // Invoquer le callback onMessageReceived s'il existe
      if (typeof this.callbacks.onMessageReceived === 'function') {
        this.callbacks.onMessageReceived(message, type, groupId);
      }
    });
    
    // Événement: Confirmation d'envoi de message
    chatWebSocketService.on('onMessageConfirm', (confirmation) => {
      console.log('Message envoyé avec succès:', confirmation);
      
      // Invoquer le callback onMessageSent s'il existe
      if (typeof this.callbacks.onMessageSent === 'function') {
        this.callbacks.onMessageSent(confirmation);
      }
    });
    
    // Événement: Confirmation de suppression de message
    chatWebSocketService.on('onDeleteConfirm', (confirmation) => {
      console.log('Delete confirmation received:', confirmation);
      
      if (typeof this.callbacks.onDeleteConfirm === 'function') {
        this.callbacks.onDeleteConfirm(confirmation);
      }
    });
    
    // Événement: Informations sur un salon
    chatWebSocketService.on('onRoomInfo', (info) => {
      if (info.status === 'SUCCESS' && info.data) {
        // Stocker les informations du salon
        this.rooms.set(info.data.id, info.data);
        
        // Demander les messages récents de ce salon
        chatWebSocketService.getMessagesByRoomId(info.data.id);
      }
      
      // Invoquer le callback onRoomInfo s'il existe
      if (typeof this.callbacks.onRoomInfo === 'function') {
        this.callbacks.onRoomInfo(info);
      }
    });
    
    // Événement: Réception de messages
    chatWebSocketService.on('onMessagesReceived', (response) => {
      console.log('Messages received:', response);
      
      if (response.status === 'SUCCESS' && response.data) {
        const messages = response.data;
        console.log('Message data:', messages);
        
        // If we have an array of messages
        if (Array.isArray(messages) && messages.length > 0) {
          // Try to get roomId from the first message
          const roomId = messages[0].roomId;
          
          if (roomId) {
            console.log(`Storing ${messages.length} messages for room ${roomId}`);
            // Stocker les messages dans le stockage local
            this._setMessages(roomId, messages);
          } else {
            console.error('No roomId found in messages:', messages);
          }
        } else {
          console.warn('No messages found in response:', response);
        }
      } else {
        console.warn('Invalid message response:', response);
      }
      
      // Invoquer le callback onMessagesLoaded s'il existe
      if (typeof this.callbacks.onMessagesLoaded === 'function') {
        this.callbacks.onMessagesLoaded(response);
      }
    });
    
    // Événement: Notification de frappe
    chatWebSocketService.on('onTyping', (status, type, groupId) => {
      console.log('Typing notification received:', status);
      const { user, typing, roomId, userId } = status;
      
      // Mettre à jour la liste des utilisateurs qui tapent
      if (roomId) {
        if (!this.typingUsers.has(roomId)) {
          this.typingUsers.set(roomId, new Set());
        }
        
        const typingSet = this.typingUsers.get(roomId);
        
        if (typing) {
          typingSet.add(user);
        } else {
          typingSet.delete(user);
        }
      }
      
      // Invoquer le callback onTyping s'il existe
      if (typeof this.callbacks.onTyping === 'function') {
        this.callbacks.onTyping(status.user, status.typing, status.userId);
      }
    });
    
    // Listener pour les notifications de suppression de message
    chatWebSocketService.on('onMessageDeleted', (deletionData, roomId) => {
      // Accept both 'deletion' and 'MESSAGE_DELETED' types for compatibility
      if (
        deletionData &&
        (deletionData.type === 'deletion' || deletionData.type === 'MESSAGE_DELETED') &&
        deletionData.messageId
      ) {
        console.log(`Message deletion notification for room ${roomId}:`, deletionData);
        // Relay to the callback
        if (typeof this.callbacks.onMessageDeleted === 'function') {
          this.callbacks.onMessageDeleted(deletionData);
        }
      } else {
        console.log('Ignored non-deletion notification on onMessageDeleted:', deletionData);
      }
    });
    
    // Événement: Arrêt du serveur
    chatWebSocketService.on('onServerShutdown', (data) => {
      console.warn('Server shutdown notification received:', data);
      
      // Create a custom event to be handled by our service
      const shutdownEvent = new CustomEvent('serverShutdown', { 
        detail: { 
          reason: data.message || 'Server maintenance',
          timestamp: new Date().toISOString(),
          reconnectAfter: data.reconnectAfter || 30000 // Default 30 seconds
        } 
      });
      
      // Dispatch the event to trigger our shutdown handler
      window.dispatchEvent(shutdownEvent);
    });
  }

  /**
   * Ajoute un message au stockage local
   * @param {Object} message - Le message à ajouter
   */
  _addMessage(message) {
    if (!message) return;
    
    const roomId = message.roomId;
    if (!roomId) return;
    
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    
    const messages = this.messages.get(roomId);
    
    // Normalize the message format
    const normalizedMessage = this._normalizeMessageFormat(message);
    
    // Vérifier si le message existe déjà (éviter les doublons)
    const exists = messages.some(m => m.id === normalizedMessage.id);
    
    if (!exists) {
      messages.push(normalizedMessage);
      
      // Trier les messages par date
      messages.sort((a, b) => {
        try {
          return new Date(a.timestamp) - new Date(b.timestamp);
        } catch (e) {
          return 0; // Keep the order unchanged if there's an error
        }
      });
    }
  }
  
  /**
   * Normalizes message format to ensure consistent structure
   * @param {Object} message - The message to normalize
   * @returns {Object} - The normalized message
   */
  _normalizeMessageFormat(message) {
    // Create a copy to avoid modifying the original
    const normalizedMessage = { ...message };
    
    // Handle sender formatting
    if (typeof message.sender === 'string') {
      // If sender is just a string, convert to object with username
      normalizedMessage.sender = {
        username: message.sender,
        id: message.senderId || message.sender // Use senderId if available or fallback to string
      };
    } else if (!message.sender) {
      // If sender is missing, add a placeholder
      normalizedMessage.sender = {
        username: 'Unknown',
        id: 'unknown'
      };
    }
    
    // Make sure timestamp exists and is valid
    if (!message.timestamp || isNaN(new Date(message.timestamp).getTime())) {
      normalizedMessage.timestamp = new Date().toISOString();
    }
    
    return normalizedMessage;
  }

  /**
   * Définit les messages d'un salon
   * @param {number} roomId - ID du salon
   * @param {Array} messages - Les messages à stocker
   */
  _setMessages(roomId, messages) {
    if (!roomId || !Array.isArray(messages)) return;
    
    // Normalize all messages
    const normalizedMessages = messages.map(msg => this._normalizeMessageFormat(msg));
    
    // Trier les messages par date
    try {
      const sortedMessages = [...normalizedMessages].sort((a, b) => {
        try {
          return new Date(a.timestamp) - new Date(b.timestamp);
        } catch (e) {
          return 0;
        }
      });
      
      this.messages.set(roomId, sortedMessages);
    } catch (e) {
      console.error('Error sorting messages:', e);
      // If sorting fails, just store them as is
      this.messages.set(roomId, normalizedMessages);
    }
  }

  /**
   * Supprime un message du stockage local
   * @param {number} messageId - ID du message
   * @param {number} roomId - ID du salon
   */
  _removeMessage(messageId, roomId) {
    if (this.messages.has(roomId)) {
      const messages = this.messages.get(roomId);
      const index = messages.findIndex(m => m.id === messageId);
      
      if (index !== -1) {
        messages.splice(index, 1);
      }
    }
  }

  /**
   * Rejoint le salon de chat global
   * @returns {Promise} - Promise résolue avec l'ID du salon
   */
  joinGlobalChat() {
    return chatWebSocketService.joinGlobalChat();
  }

  /**
   * Rejoint un salon de chat de guilde
   * @param {number} guildId - ID de la guilde
   * @returns {Promise} - Promise résolue avec l'ID du salon
   */
  joinGuildChat(guildId) {
    return chatWebSocketService.joinGuildChat(guildId);
  }

  /**
   * Envoie un message dans un salon
   * @param {number} roomId - ID du salon
   * @param {string} content - Contenu du message
   * @returns {Promise} - Promise résolue quand le message est envoyé
   */
  /**
   * Envoie un message dans un salon
   * @param {string} roomId - ID du salon
   * @param {string} content - Contenu du message
   * @returns {Promise} - Promise résolue quand le message est envoyé
   */
  sendMessage(roomId, content) {
    // Get the current user ID to ensure it's included with the message
    const userId = this.currentUser?.id || getUserId();
    
    // Log the user ID being used for message ownership tracking
    if (userId) {
      console.log(`Sending message with explicit user ID: ${userId}`);
    } else {
      console.warn('No user ID available for message sending - ownership detection may not work correctly');
    }
    
    // Pass the message to the WebSocket service
    return chatWebSocketService.sendMessage(roomId, content);
  }

  /**
   * Supprime un message
   * @param {number} messageId - ID du message
   * @param {number} roomId - ID du salon
   * @returns {Promise} - Promise résolue quand le message est supprimé
   */
  deleteMessage(messageId, roomId) {
    return chatWebSocketService.deleteMessage(messageId, roomId);
  }

  /**
   * Envoie une notification de frappe
   * @param {number} roomId - ID du salon
   * @param {boolean} isTyping - État de la frappe
   */
  setTypingStatus(roomId, isTyping) {
    chatWebSocketService.sendTypingStatus(roomId, isTyping);
  }

  /**
   * Récupère les messages d'un salon
   * @param {number} roomId - ID du salon
   * @returns {Array} - Les messages du salon
   */
  getMessages(roomId) {
    return this.messages.has(roomId) ? [...this.messages.get(roomId)] : [];
  }

  /**
   * Récupère les informations d'un salon
   * @param {number} roomId - ID du salon
   * @returns {Object} - Les informations du salon
   */
  getRoomInfo(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Récupère la liste des utilisateurs en train de taper
   * @param {number} roomId - ID du salon
   * @returns {Array} - Liste des noms d'utilisateurs
   */
  getTypingUsers(roomId) {
    if (!this.typingUsers.has(roomId)) {
      return [];
    }
    
    return Array.from(this.typingUsers.get(roomId));
  }

  /**
   * Quitte un salon de chat
   * @param {string} type - Type de salon (GLOBAL, GUILD, FIGHT)
   * @param {number} groupId - ID du groupe (guilde ou combat)
   */
  leaveChat(type, groupId = null) {
    chatWebSocketService.leaveChat(type, groupId);
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
   * Supprime un callback
   * @param {String} event - Nom de l'événement
   */
  off(event) {
    if (this.callbacks[event]) {
      delete this.callbacks[event];
    }
  }

  /**
   * Se déconnecte du chat
   */
  disconnect() {
    // Only cleanup if we're initialized
    if (!this.initialized) return;

    console.log('Chat service disconnecting...');
    
    // Remove event listeners
    window.removeEventListener('websocketReconnectFailed', this._handleReconnectFailed);
    window.removeEventListener('websocketError', this._handleWebSocketError);
    window.removeEventListener('serverShutdown', this._handleServerShutdown);
    
    // Clear any shutdown reconnect timer
    if (this._shutdownReconnectTimer) {
      clearTimeout(this._shutdownReconnectTimer);
      this._shutdownReconnectTimer = null;
    }
    
    // Reset shutdown flags
    this._serverShutdownInProgress = false;
    
    // Cleanup the reconnector
    chatSocketReconnector.cleanup();
    
    // Cancel any pending reconnection
    this._isReconnecting = false;
    
    // Déconnecter du WebSocket
    try {
      chatWebSocketService.disconnect();
    } catch (e) {
      console.warn('Error during WebSocket disconnect:', e);
      // Continue with cleanup regardless
    }
    
    // Réinitialiser les données
    this.rooms.clear();
    this.messages.clear();
    this.typingUsers.clear();
    this.initialized = false;
    this.currentUser = null;
    
    console.log('Chat service disconnected');
  }

  /**
   * Récupère les informations sur un salon de chat
   * @param {string} roomId - ID du salon de chat
   * @returns {Object} - Données du salon ou un objet vide
   */
  getRoomData(roomId) {
    // Try to get room data from WebSocketService
    try {
      const roomInfo = chatWebSocketService.roomInfo || {};
      
      if (roomInfo[roomId]) {
        return roomInfo[roomId];
      }
      
      // For global chat, provide basic info with admin status based on user role
      if (roomId === 'global' || roomId === 'GLOBAL') {
        // You would normally get this from your user details
        // Here we're just using a placeholder implementation
        const userEmail = this.currentUser?.email || "";
        const isAdmin = userEmail.includes('admin') || false;
        
        return {
          id: 1,
          name: 'Global Chat',
          type: 'GLOBAL',
          isAdmin
        };
      }
      
      // For guild chats, extract guild ID and provide basic info
      if (roomId && roomId.includes('guild') && this.currentUser) {
        const guildId = roomId.split('.')[1];
        // In a real implementation, you'd check if the user is a guild admin
        
        return {
          id: guildId,
          name: `Guild Chat ${guildId}`,
          type: 'GUILD',
          isAdmin: false // Default to false, would be determined by backend
        };
      }
    } catch (error) {
      console.warn('Error getting room data:', error);
    }
    
    return {};
  }
}

// Exporter une instance singleton
export default new ChatService();