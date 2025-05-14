import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { getToken, isAuthenticated } from './authService';

class ChatWebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.subscribers = {
      global: [],
      guild: {},
      duel: {},
      delete: {}
    };
    this.reconnectInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isAttemptingConnection = false;
    
    this.eventHandlers = {
      CHAT_MESSAGE: [],
      onChatMessage: [],
      MESSAGE_DELETED: [],
      onMessageDeleted: [],
      onOpen: [],
      onClose: [],
      onError: []
    };
    
    // Set up event listeners for WebSocket state
    window.addEventListener('ws:open', () => this.notifyHandlers('onOpen'));
    window.addEventListener('ws:close', () => this.notifyHandlers('onClose'));
    window.addEventListener('ws:error', () => this.notifyHandlers('onError'));
    
    // Transaction tracking to avoid duplicate message processing
    this.processedTransactions = new Set();
    this.transactionTimestamps = new Map();
    setInterval(this.cleanupOldTransactions.bind(this), 60000); // Check every minute
  }
  
  hasProcessedTransaction(transactionId) {
    return this.processedTransactions.has(transactionId);
  }
  
  markTransactionProcessed(transactionId) {
    this.processedTransactions.add(transactionId);
    this.transactionTimestamps.set(transactionId, Date.now());
  }
  
  cleanupOldTransactions() {
    const now = Date.now();
    const expirationTime = 5 * 60 * 1000; // 5 minutes
    
    // Remove expired transactions
    for (const [transactionId, timestamp] of this.transactionTimestamps.entries()) {
      if (now - timestamp > expirationTime) {
        this.processedTransactions.delete(transactionId);
        this.transactionTimestamps.delete(transactionId);
      }
    }
    
    // Trim if too large
    const maxTransactions = 1000;
    if (this.processedTransactions.size > maxTransactions) {
      const sortedTransactions = [...this.transactionTimestamps.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, this.processedTransactions.size - 500);
      
      for (const [transactionId] of sortedTransactions) {
        this.processedTransactions.delete(transactionId);
        this.transactionTimestamps.delete(transactionId);
      }
    }
  }

  connect() {
    if (this.connected && this.stompClient) {
      return Promise.resolve();
    }
    
    if (this.isAttemptingConnection) {
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.connected) {
            clearInterval(checkConnection);
            resolve();
          } else if (!this.isAttemptingConnection) {
            clearInterval(checkConnection);
            reject(new Error('Connection attempt failed'));
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkConnection);
          this.isAttemptingConnection = false;
          if (!this.connected) {
            reject(new Error('Connection attempt timed out'));
          }
        }, 3000);
      });
    }
    
    this.isAttemptingConnection = true;
    
    return new Promise((resolve, reject) => {
      try {
        if (!isAuthenticated()) {
          this.isAttemptingConnection = false;
          reject(new Error('User not authenticated'));
          return;
        }

        const token = getToken();
        if (!token) {
          this.isAttemptingConnection = false;
          reject(new Error('No authentication token found'));
          return;
        }

        const socketFactory = () => {
          const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
          const wsEndpoint = `${backendUrl}/ws-chat`;
          const sockJsUrl = `${wsEndpoint}?token=${encodeURIComponent(token)}`;
          
          return new SockJS(sockJsUrl, null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
            timeout: 5000
          });
        };

        this.stompClient = Stomp.over(socketFactory);
        this.stompClient.debug = () => {}; // Disable STOMP debug logging

        const connectHeaders = { 
          'Authorization': `Bearer ${token}`,
          'X-Auth-Token': token
        };
        
        this.stompClient.connect(
          connectHeaders,
          () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.isAttemptingConnection = false;
            clearInterval(this.reconnectInterval);
            
            window.dispatchEvent(new Event('ws:open'));
            this.setupPendingSubscriptions();
            resolve();
          },
          (error) => {
            this.connected = false;
            this.isAttemptingConnection = false;
            window.dispatchEvent(new Event('ws:error'));
            this.scheduleReconnect();
            reject(error);
          }
        );
      } catch (error) {
        this.connected = false;
        this.isAttemptingConnection = false;
        window.dispatchEvent(new Event('ws:error'));
        reject(error);
      }
    });
  }
  
  setupPendingSubscriptions() {
    // Set up global chat subscriptions
    if (this.subscribers.global.length > 0) {
      const globalSubscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
        try {
          const data = JSON.parse(message.body);
          
          this.subscribers.global.forEach(sub => {
            if (sub.callback) sub.callback(data);
          });
          
          this.notifyHandlers('CHAT_MESSAGE', { ...data, chatType: 'GLOBAL' });
          this.notifyHandlers('onChatMessage', { ...data, chatType: 'GLOBAL' });
        } catch (err) {
          console.error('Error processing global message:', err);
        }
      });
      
      this.subscribers.global.forEach(sub => {
        if (sub.subscription && sub.subscription.isPending) {
          sub.subscription = globalSubscription;
        }
      });
    }
    
    // Set up guild chat subscriptions
    Object.keys(this.subscribers.guild).forEach(guildId => {
      const subs = this.subscribers.guild[guildId];
      if (subs && subs.length > 0) {
        const destination = `/topic/chat/guild.${guildId}`;
        
        const guildSubscription = this.stompClient.subscribe(destination, (message) => {
          try {
            let data = JSON.parse(message.body);
            
            // Ensure we have consistent data format
            const enhancedData = { 
              ...data, 
              chatType: 'GUILD', 
              guildId: guildId 
            };
            
            subs.forEach(sub => {
              if (sub.callback) {
                try {
                  sub.callback(enhancedData);
                } catch (callbackError) {
                  console.error(`Error in guild ${guildId} callback:`, callbackError);
                }
              }
            });
            
            this.notifyHandlers('CHAT_MESSAGE', enhancedData);
            this.notifyHandlers('onChatMessage', enhancedData);
          } catch (err) {
            console.error(`Error processing guild message for guild ${guildId}:`, err);
          }
        });
        
        subs.forEach(sub => {
          if (sub.subscription && sub.subscription.isPending) {
            sub.subscription = guildSubscription;
          }
        });
      }
    });
    
    // Set up duel chat subscriptions
    Object.keys(this.subscribers.duel).forEach(battleId => {
      const subs = this.subscribers.duel[battleId];
      if (subs && subs.length > 0) {
        const destination = `/topic/chat/duel.${battleId}`;
        
        const duelSubscription = this.stompClient.subscribe(destination, (message) => {
          try {
            const data = JSON.parse(message.body);
            
            subs.forEach(sub => {
              if (sub.callback) sub.callback(data);
            });
            
            this.notifyHandlers('CHAT_MESSAGE', { ...data, chatType: 'FIGHT', battleId });
            this.notifyHandlers('onChatMessage', { ...data, chatType: 'FIGHT', battleId });
          } catch (err) {
            console.error(`Error processing duel message for battle ${battleId}:`, err);
          }
        });
        
        subs.forEach(sub => {
          if (sub.subscription && sub.subscription.isPending) {
            sub.subscription = duelSubscription;
          }
        });
      }
    });
    
    // Set up delete event subscriptions
    Object.keys(this.subscribers.delete).forEach(key => {
      const subs = this.subscribers.delete[key];
      if (subs && subs.length > 0) {
        let destination = '';
        let chatType = '';
        let roomId = null;
        
        if (key === 'global') {
          destination = '/topic/chat/global/delete';
          chatType = 'GLOBAL';
        } else if (key.startsWith('guild_')) {
          roomId = key.split('_')[1];
          destination = `/topic/chat/guild.${roomId}/delete`;
          chatType = 'GUILD';
        } else if (key.startsWith('duel_')) {
          roomId = key.split('_')[1];
          destination = `/topic/chat/duel.${roomId}/delete`;
          chatType = 'FIGHT';
        }
        
        if (destination) {
          const deleteSubscription = this.stompClient.subscribe(destination, (message) => {
            try {
              const data = JSON.parse(message.body);
              const messageId = data.messageId || data.id;
              const transactionId = data.transactionId || `ws-delete-${messageId}-${Date.now()}`;
              
              if (this.hasProcessedTransaction(transactionId)) {
                return;
              }
              
              this.markTransactionProcessed(transactionId);
              
              const deleteEvent = {
                type: 'delete',
                messageId: messageId,
                roomId: data.roomId || roomId,
                uniqueId: data.uniqueId,
                transactionId: transactionId,
                chatType: chatType
              };
              
              // Notify all subscribers
              subs.forEach(sub => {
                if (sub.callback) sub.callback(deleteEvent);
              });
              
              this.notifyHandlers('MESSAGE_DELETED', deleteEvent);
              this.notifyHandlers('onMessageDeleted', deleteEvent);
            } catch (err) {
              console.error(`Error processing delete event for ${key}:`, err);
            }
          });
          
          subs.forEach(sub => {
            if (sub.subscription && sub.subscription.isPending) {
              sub.subscription = deleteSubscription;
            }
          });
        }
      }
    });
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        this.connected = false;
        clearInterval(this.reconnectInterval);
        window.dispatchEvent(new Event('ws:close'));
      });
    }
  }

  scheduleReconnect() {
    clearInterval(this.reconnectInterval);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectInterval = setInterval(() => {
        this.reconnectAttempts++;
        this.connect().catch(() => {
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            clearInterval(this.reconnectInterval);
          }
        });
      }, 5000);
    }
  }

  isConnected() {
    return this.connected && this.stompClient !== null;
  }
  
  notifyHandlers(eventType, eventData) {
    // Add chatType if missing but can be inferred
    if (eventData) {
      if (!eventData.chatType) {
        if (eventData.guildId || (eventData.roomType === 'GUILD')) {
          eventData.chatType = 'GUILD';
        } else if (eventData.roomId && eventData.roomId.toString().startsWith('guild-')) {
          eventData.chatType = 'GUILD';
          const guildIdMatch = eventData.roomId.toString().match(/guild-(\d+)/);
          if (guildIdMatch && guildIdMatch[1]) {
            eventData.guildId = guildIdMatch[1];
          }
        }
      }
    }
    
    // Notify registered event handlers
    if (this.eventHandlers[eventType]) {
      this.eventHandlers[eventType].forEach(handler => {
        try {
          handler.callback(eventData);
        } catch (err) {
          console.error(`Error in ${eventType} handler:`, err);
        }
      });
    }
  }
  
  addHandler(eventType, callback) {
    if (!callback || typeof callback !== 'function') {
      console.error(`Invalid callback for event type: ${eventType}`);
      return null;
    }
    
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }
    
    const handlerId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.eventHandlers[eventType].push({ id: handlerId, callback });
    
    return handlerId;
  }
  
  removeHandler(handlerId) {
    if (!handlerId) return false;
    
    let removed = false;
    Object.keys(this.eventHandlers).forEach(eventType => {
      const handlers = this.eventHandlers[eventType];
      const index = handlers.findIndex(h => h.id === handlerId);
      
      if (index !== -1) {
        handlers.splice(index, 1);
        removed = true;
      }
    });
    
    return removed;
  }

  subscribeToGlobalChat(callback) {
    if (!callback) return { unsubscribe: () => {} };
    
    const dummySubscription = { unsubscribe: () => {}, isPending: true };
    this.subscribers.global.push({ callback, subscription: dummySubscription });

    if (!this.connected) {
      this.connect().catch(err => console.warn('Failed to connect for subscription:', err));
      this.subscribeToDeleteEvents('global', null, callback);
      
      return {
        unsubscribe: () => {
          this.subscribers.global = this.subscribers.global.filter(sub => sub.callback !== callback);
        }
      };
    }

    try {
      const subscription = this.stompClient.subscribe('/topic/chat/global', message => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error('Error processing global message:', err);
        }
      });
      
      this.subscribers.global.push({ callback, subscription });
      this.subscribeToDeleteEvents('global', null, callback);
      
      return {
        unsubscribe: () => {
          if (subscription) subscription.unsubscribe();
          this.subscribers.global = this.subscribers.global.filter(sub => sub.callback !== callback);
        }
      };
    } catch (error) {
      console.error('Error subscribing to global chat:', error);
      return { unsubscribe: () => {} };
    }
  }

  subscribeToGuildChat(guildId, callback) {
    if (!guildId) {
      console.error('Guild ID is required for guild chat subscription');
      return { unsubscribe: () => {} };
    }
    
    if (!callback) return { unsubscribe: () => {} };
    
    if (!this.subscribers.guild[guildId]) {
      this.subscribers.guild[guildId] = [];
    }
    
    const dummySubscription = { unsubscribe: () => {}, isPending: true };
    this.subscribers.guild[guildId].push({ callback, subscription: dummySubscription });

    const createSubscription = () => {
      if (!this.stompClient) return null;
      
      try {
        return this.stompClient.subscribe(`/topic/chat/guild.${guildId}`, message => {
          try {
            const data = JSON.parse(message.body);
            
            // Avoid duplicates
            if (data.transactionId && this.hasProcessedTransaction(data.transactionId)) return;
            
            // Mark as processed
            if (data.transactionId) {
              this.markTransactionProcessed(data.transactionId);
            } else if (data.id) {
              const fallbackTxId = `guild-msg-${data.id}-${guildId}`;
              if (this.hasProcessedTransaction(fallbackTxId)) return;
              this.markTransactionProcessed(fallbackTxId);
            }
            
            const enhancedData = { ...data, guildId: guildId, chatType: 'GUILD' };
            callback(enhancedData);
          } catch (err) {
            console.error(`Error processing guild message for guild ${guildId}:`, err);
          }
        });
      } catch (error) {
        console.error(`Error subscribing to guild chat for guild ${guildId}:`, error);
        return null;
      }
    };

    if (!this.connected) {
      this.connect().catch(err => console.warn(`Failed to connect for guild ${guildId} subscription:`, err));
      this.subscribeToDeleteEvents('guild', guildId, callback);
      
      return {
        unsubscribe: () => {
          if (this.subscribers.guild[guildId]) {
            this.subscribers.guild[guildId] = this.subscribers.guild[guildId].filter(
              sub => sub.callback !== callback
            );
          }
        }
      };
    }

    const subscription = createSubscription();
    this.subscribeToDeleteEvents('guild', guildId, callback);
    
    return {
      unsubscribe: () => {
        if (subscription) subscription.unsubscribe();
        
        if (this.subscribers.guild[guildId]) {
          this.subscribers.guild[guildId] = this.subscribers.guild[guildId].filter(
            sub => sub.callback !== callback
          );
        }
      }
    };
  }

  subscribeToDuelChat(battleId, callback) {
    if (!battleId || !callback) {
      if (!battleId) console.error('Battle ID is required for duel chat subscription');
      return { unsubscribe: () => {} };
    }
    
    if (!this.subscribers.duel[battleId]) {
      this.subscribers.duel[battleId] = [];
    }
    
    const dummySubscription = { unsubscribe: () => {}, isPending: true };
    this.subscribers.duel[battleId].push({ callback, subscription: dummySubscription });

    if (!this.connected) {
      this.connect().catch(err => console.warn(`Failed to connect for duel ${battleId} subscription:`, err));
      this.subscribeToDeleteEvents('duel', battleId, callback);
      
      return {
        unsubscribe: () => {
          if (this.subscribers.duel[battleId]) {
            this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
              sub => sub.callback !== callback
            );
          }
        }
      };
    }

    try {
      const subscription = this.stompClient.subscribe(`/topic/chat/duel.${battleId}`, message => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error(`Error processing duel message for battle ${battleId}:`, err);
        }
      });
      
      this.subscribers.duel[battleId].push({ callback, subscription });
      this.subscribeToDeleteEvents('duel', battleId, callback);
      
      return {
        unsubscribe: () => {
          if (subscription) subscription.unsubscribe();
          
          if (this.subscribers.duel[battleId]) {
            this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
              sub => sub.callback !== callback
            );
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to duel chat for battle ${battleId}:`, error);
      return { unsubscribe: () => {} };
    }
  }

  subscribeToDeleteEvents(chatType, id, callback) {
    if (!callback) return { unsubscribe: () => {} };

    const key = chatType === 'global' ? 'global' : `${chatType}_${id}`;
    let destination;
    
    if (chatType === 'global') {
      destination = '/topic/chat/global/delete';
    } else if (chatType === 'guild') {
      destination = `/topic/chat/guild.${id}/delete`;
    } else if (chatType === 'duel' || chatType === 'FIGHT') {
      destination = `/topic/chat/duel.${id}/delete`;
    } else {
      return { unsubscribe: () => {} };
    }
    
    if (!this.subscribers.delete[key]) {
      this.subscribers.delete[key] = [];
    }

    if (!this.connected) {
      const pendingSubscription = {
        unsubscribe: () => {
          if (this.subscribers.delete[key]) {
            this.subscribers.delete[key] = this.subscribers.delete[key].filter(
              sub => sub.callback !== callback
            );
          }
        },
        isPending: true
      };
      
      this.subscribers.delete[key].push({ callback, subscription: pendingSubscription });
      return pendingSubscription;
    }

    try {
      const wrappedCallback = message => {
        try {
          const data = JSON.parse(message.body);
          const messageId = data.messageId || data.id;
          const transactionId = data.transactionId || `ws-delete-${messageId}-${Date.now()}`;
          
          if (this.hasProcessedTransaction(transactionId)) return;
          
          const recentKey = `recent-${messageId}`;
          if (messageId && this.hasProcessedTransaction(recentKey)) return;
          
          this.markTransactionProcessed(transactionId);
          if (messageId) {
            this.markTransactionProcessed(recentKey);
          }
          
          callback({
            type: 'delete',
            messageId: messageId,
            roomId: data.roomId || id,
            uniqueId: data.uniqueId,
            transactionId: transactionId
          });
        } catch (err) {
          console.error(`Error processing delete event for ${chatType} ${id || ''}:`, err);
        }
      };
      
      const subscription = this.stompClient.subscribe(destination, wrappedCallback);
      this.subscribers.delete[key].push({ callback, subscription, wrappedCallback });

      return {
        unsubscribe: () => {
          if (subscription) subscription.unsubscribe();
          
          if (this.subscribers.delete[key]) {
            this.subscribers.delete[key] = this.subscribers.delete[key].filter(
              sub => sub.callback !== callback
            );
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to delete events for ${chatType} ${id || ''}:`, error);
      return { unsubscribe: () => {} };
    }
  }

  sendMessage(messageData) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    // Generate a transaction ID if not provided
    if (!messageData.transactionId) {
      messageData.transactionId = `ws-send-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Mark our own transaction as processed to avoid echo
    this.markTransactionProcessed(messageData.transactionId);
    
    // Determine destination based on chat type
    let destination = '/app/chat';
    
    if (messageData.chatType === 'GUILD' && messageData.guildId) {
      destination = `/app/chat/guild/${messageData.guildId}`;
    } else if (messageData.chatType === 'FIGHT' || messageData.chatType === 'DUEL') {
      destination = `/app/chat/duel/${messageData.roomId || messageData.battleId}`;
    }
    
    // Add timestamp if not provided
    if (!messageData.timestamp) {
      messageData.timestamp = new Date().toISOString();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.stompClient.send(destination, {}, JSON.stringify(messageData));
        resolve(messageData);
      } catch (error) {
        console.error('Failed to send message:', error);
        reject(error);
      }
    });
  }

  deleteMessage(data) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('Not connected to WebSocket server'));
    }

    return new Promise((resolve, reject) => {
      try {
        this.stompClient.send('/app/chat.deleteMessage', {}, JSON.stringify(data));
        resolve();
      } catch (error) {
        console.error('Error sending delete request via WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Delete a message via WebSocket
   * @param {Object} payload - The message deletion payload
   * @param {string|number} payload.messageId - The ID of the message to delete
   * @param {string|number} payload.roomId - The ID of the room containing the message
   * @param {string} [payload.uniqueId] - Optional unique ID for the message
   * @param {string} [payload.transactionId] - Optional transaction ID for tracking
   * @param {string} [payload.chatType] - The type of chat (GLOBAL, GUILD, FIGHT)
   * @returns {Promise} A promise that resolves when the deletion is complete
   */
  deleteMessage(payload) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    const { messageId, roomId, uniqueId, transactionId } = payload;
    const effectiveTransactionId = transactionId || `ws-delete-${messageId}-${Date.now()}`;
    
    // Mark this transaction as processed to prevent duplicate processing
    this.markTransactionProcessed(effectiveTransactionId);
    
    return new Promise((resolve, reject) => {
      // Set up a one-time handler for the response
      const subscription = this.stompClient.subscribe('/user/queue/chat/delete', message => {
        try {
          const response = JSON.parse(message.body);
          
          // Unsubscribe immediately to avoid memory leaks
          subscription.unsubscribe();
          
          if (response.error) {
            reject(new Error(response.message || response.error));
          } else {
            resolve(response);
          }
        } catch (err) {
          reject(err);
        }
      });
      
      try {
        console.log(`[ChatWebSocketService] Sending delete message request via WebSocket for message ${messageId} in room ${roomId}`);
        
        // Create the delete message payload
        const deletePayload = {
          messageId: messageId.toString(),
          roomId: roomId.toString(),
          transactionId: effectiveTransactionId
        };
        
        if (uniqueId) {
          deletePayload.uniqueId = uniqueId;
        }
        
        // Send the delete message request
        this.stompClient.send('/app/chat.deleteMessageDirect', {}, JSON.stringify(deletePayload));
        
        // Set a timeout to prevent hanging
        setTimeout(() => {
          try {
            subscription.unsubscribe();
            reject(new Error('Delete message request timed out'));
          } catch (e) {
            // Subscription might have already been closed
          }
        }, 10000);
      } catch (error) {
        console.error(`[ChatWebSocketService] Error deleting message ${messageId} via WebSocket:`, error);
        subscription.unsubscribe();
        reject(error);
      }
    });
  }

  /**
   * Fetch a chat room via WebSocket
   * @param {string} type - The room type ('GLOBAL', 'GUILD', 'FIGHT')
   * @param {number|null} groupId - The guild or fight ID (null for global chat)
   * @returns {Promise} A promise that resolves when the room is fetched
   */
  fetchChatRoom(type, groupId = null) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      // Generate a transaction ID
      const transactionId = `ws-fetch-room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Set up a one-time handler for the response
      const subscription = this.stompClient.subscribe('/user/queue/chat/rooms', message => {
        try {
          const response = JSON.parse(message.body);
          
          // Unsubscribe immediately to avoid memory leaks
          subscription.unsubscribe();
          
          if (response.error) {
            reject(new Error(response.message || response.error));
          } else {
            resolve(response.data);
          }
        } catch (err) {
          reject(err);
        }
      });
      
      // Send the request
      try {
        this.stompClient.send('/app/chat.getRoom', {}, JSON.stringify({
          type: type,
          groupId: groupId,
          transactionId: transactionId
        }));
      } catch (err) {
        subscription.unsubscribe();
        reject(err);
      }
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        try {
          subscription.unsubscribe();
          reject(new Error('Request timed out'));
        } catch (e) {
          // Subscription might have already been closed
        }
      }, 10000);
    });
  }
  
  /**
   * Fetch chat messages via WebSocket
   * @param {number} roomId - The room ID
   * @param {number} limit - Maximum number of messages to fetch
   * @returns {Promise} A promise that resolves to the list of messages
   */
  fetchChatMessages(roomId, limit = 50) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      // Generate a transaction ID
      const transactionId = `ws-fetch-messages-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Set up a one-time handler for the response
      const subscription = this.stompClient.subscribe('/user/queue/chat/messages', message => {
        try {
          const response = JSON.parse(message.body);
          
          // Unsubscribe immediately to avoid memory leaks
          subscription.unsubscribe();
          
          if (response.error) {
            reject(new Error(response.message || response.error));
          } else {
            resolve(response.data);
          }
        } catch (err) {
          reject(err);
        }
      });
      
      // Send the request
      try {
        this.stompClient.send('/app/chat.getMessages', {}, JSON.stringify({
          roomId: roomId,
          limit: limit,
          transactionId: transactionId
        }));
      } catch (err) {
        subscription.unsubscribe();
        reject(err);
      }
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        try {
          subscription.unsubscribe();
          reject(new Error('Request timed out'));
        } catch (e) {
          // Subscription might have already been closed
        }
      }, 10000);
    });
  }

  /**
   * Subscribe to messages from a specific chat room
   * @param {number|string} roomId - The ID of the room to subscribe to
   * @returns {object} A subscription object with an unsubscribe method
   */
  subscribeToRoom(roomId) {
    if (!this.connected || !this.stompClient) {
      console.warn('Cannot subscribe to room, WebSocket not connected');
      return { unsubscribe: () => {} };
    }
    
    try {
      console.log(`[ChatWebSocketService] Subscribing to room ${roomId}`);
      const subscription = this.stompClient.subscribe(`/topic/chat.room.${roomId}`, message => {
        try {
          const data = JSON.parse(message.body);
          
          // Handle different message types
          if (data.type === 'CHAT_MESSAGE') {
            this.notifyHandlers('CHAT_MESSAGE', data);
            this.notifyHandlers('onChatMessage', data);
          } else if (data.type === 'MESSAGE_DELETED') {
            this.notifyHandlers('MESSAGE_DELETED', data);
            this.notifyHandlers('onMessageDeleted', data);
          }
        } catch (err) {
          console.error('Error processing message from room subscription:', err);
        }
      });
      
      // Store subscription for later cleanup
      this.roomSubscriptions = this.roomSubscriptions || new Map();
      this.roomSubscriptions.set(roomId.toString(), subscription);
      
      return {
        unsubscribe: () => {
          try {
            subscription.unsubscribe();
            this.roomSubscriptions.delete(roomId.toString());
          } catch (err) {
            console.error(`Error unsubscribing from room ${roomId}:`, err);
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to room ${roomId}:`, error);
      return { unsubscribe: () => {} };
    }
  }
  
  /**
   * Unsubscribe from a specific chat room
   * @param {number|string} roomId - The ID of the room to unsubscribe from
   */
  unsubscribeFromRoom(roomId) {
    if (!this.roomSubscriptions) {
      return;
    }
    
    const subscription = this.roomSubscriptions.get(roomId.toString());
    if (subscription) {
      try {
        subscription.unsubscribe();
        this.roomSubscriptions.delete(roomId.toString());
        console.log(`[ChatWebSocketService] Unsubscribed from room ${roomId}`);
      } catch (err) {
        console.error(`Error unsubscribing from room ${roomId}:`, err);
      }
    }
  }
}

export default new ChatWebSocketService();