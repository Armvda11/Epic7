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
      
      this.currentUser = user;
      
      // Initialize the reconnector with a callback to handle reconnections
      chatSocketReconnector.init(() => {
        console.log('Reconnector triggered a reconnection');
        // Try to re-establish the connection
        if (this.currentUser) {
          chatWebSocketService.connect()
            .then(() => {
              console.log('Reconnection successful');
              // Re-join any active rooms
              this._rejoinActiveRooms();
            })
            .catch(error => {
              console.error('Reconnection failed:', error);
              // Dispatch a global error event
              const errorEvent = new CustomEvent('chatError', { detail: error });
              window.dispatchEvent(errorEvent);
            });
        }
      });
      
      // Listen for websocket reconnect failures
      window.addEventListener('websocketReconnectFailed', this._handleReconnectFailed);
      
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
        .catch(reject);
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
        
        // Use the internal WebSocket service method to rejoin
        chatWebSocketService._joinChat(type, groupId)
          .then(() => {
            console.log(`Successfully rejoined ${type} room`);
            
            // Update the message list for this room
            chatWebSocketService.getMessages(type, groupId);
            
            // Notify listeners about the rejoined room
            if (typeof this.callbacks.onRoomJoined === 'function') {
              this.callbacks.onRoomJoined(roomId);
            }
          })
          .catch(error => {
            console.error(`Failed to rejoin ${type} room:`, error);
          });
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
      if (confirmation.status === 'SUCCESS') {
        // Supprimer le message du stockage local
        this._removeMessage(confirmation.messageId, confirmation.roomId);
      }
      
      // Invoquer le callback onMessageDeleted s'il existe
      if (typeof this.callbacks.onMessageDeleted === 'function') {
        this.callbacks.onMessageDeleted(confirmation);
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
      if (response.status === 'SUCCESS' && response.data) {
        const messages = response.data;
        const roomId = messages.length > 0 ? messages[0].roomId : null;
        
        if (roomId) {
          // Stocker les messages dans le stockage local
          this._setMessages(roomId, messages);
        }
      }
      
      // Invoquer le callback onMessagesLoaded s'il existe
      if (typeof this.callbacks.onMessagesLoaded === 'function') {
        this.callbacks.onMessagesLoaded(response);
      }
    });
    
    // Événement: Notification de frappe
    chatWebSocketService.on('onTyping', (status, type, groupId) => {
      const { username, typing, roomId } = status;
      
      // Mettre à jour la liste des utilisateurs qui tapent
      if (roomId) {
        if (!this.typingUsers.has(roomId)) {
          this.typingUsers.set(roomId, new Set());
        }
        
        const typingSet = this.typingUsers.get(roomId);
        
        if (typing) {
          typingSet.add(username);
        } else {
          typingSet.delete(username);
        }
      }
      
      // Invoquer le callback onTypingUpdated s'il existe
      if (typeof this.callbacks.onTypingUpdated === 'function') {
        this.callbacks.onTypingUpdated(status, type, groupId);
      }
    });
  }

  /**
   * Ajoute un message au stockage local
   * @param {Object} message - Le message à ajouter
   */
  _addMessage(message) {
    const roomId = message.roomId;
    
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    
    const messages = this.messages.get(roomId);
    
    // Vérifier si le message existe déjà (éviter les doublons)
    const exists = messages.some(m => m.id === message.id);
    
    if (!exists) {
      messages.push(message);
      
      // Trier les messages par date
      messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  }

  /**
   * Définit les messages d'un salon
   * @param {number} roomId - ID du salon
   * @param {Array} messages - Les messages à stocker
   */
  _setMessages(roomId, messages) {
    // Trier les messages par date
    const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    this.messages.set(roomId, sortedMessages);
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
  sendMessage(roomId, content) {
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
   * Se déconnecte du chat
   */
  disconnect() {
    // Remove event listeners
    window.removeEventListener('websocketReconnectFailed', this._handleReconnectFailed);
    
    // Cleanup the reconnector
    chatSocketReconnector.cleanup();
    
    // Déconnecter du WebSocket
    chatWebSocketService.disconnect();
    
    // Réinitialiser les données
    this.rooms.clear();
    this.messages.clear();
    this.typingUsers.clear();
    this.initialized = false;
    this.currentUser = null;
  }
}

// Exporter une instance singleton
export default new ChatService();