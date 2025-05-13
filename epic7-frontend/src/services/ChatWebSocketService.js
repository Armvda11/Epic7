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
      typing: {},
      delete: {}
    };
    this.reconnectInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isAttemptingConnection = false;
    
    // Add event handlers storage
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
    
    // Add a processed transactions cache to avoid duplicate event processing
    this.processedTransactions = new Set();
    this.transactionTimestamps = new Map();
    // Set up a timer to clean old transaction records periodically
    setInterval(this.cleanupOldTransactions.bind(this), 60000); // Check every minute
  }
  
  /**
   * Check if a transaction has already been processed
   */
  hasProcessedTransaction(transactionId) {
    return this.processedTransactions.has(transactionId);
  }
  
  /**
   * Mark a transaction as processed and store the timestamp
   */
  markTransactionProcessed(transactionId) {
    this.processedTransactions.add(transactionId);
    this.transactionTimestamps.set(transactionId, Date.now());
  }
  
  /**
   * Clean up old transaction records to prevent memory leaks
   */
  cleanupOldTransactions() {
    const now = Date.now();
    const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Remove transactions older than the expiration time
    for (const [transactionId, timestamp] of this.transactionTimestamps.entries()) {
      if (now - timestamp > expirationTime) {
        this.processedTransactions.delete(transactionId);
        this.transactionTimestamps.delete(transactionId);
      }
    }
    
    // If the set gets too large, trim it
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

  /**
   * Connect to the WebSocket server
   */
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
        this.stompClient.debug = () => {};

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
  
  /**
   * Set up all pending subscriptions when connection is established
   */
  setupPendingSubscriptions() {
    console.log('[ChatWebSocketService] Setting up pending subscriptions');
    
    // Set up global chat subscriptions
    if (this.subscribers.global.length > 0) {
      console.log(`[ChatWebSocketService] Setting up ${this.subscribers.global.length} global chat subscriptions`);
      // Updated path to match server's broadcast destination
      const globalSubscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
        try {
          console.log('[ChatWebSocketService] Received global message:', message.body);
          const data = JSON.parse(message.body);
          
          // Notify listeners via both subscription mechanism and event system
          this.subscribers.global.forEach(sub => {
            if (sub.callback) sub.callback(data);
          });
          
          this.notifyHandlers('CHAT_MESSAGE', { ...data, chatType: 'GLOBAL' });
          this.notifyHandlers('onChatMessage', { ...data, chatType: 'GLOBAL' });
        } catch (err) {
          console.error('[ChatWebSocketService] Error processing global message:', err);
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
        console.log(`[ChatWebSocketService] Setting up ${subs.length} guild chat subscriptions for guild ${guildId}`);
        // Updated path to match server's broadcast path
        const destination = `/topic/chat/guild.${guildId}`;
        console.log(`[ChatWebSocketService] Subscribing to: ${destination}`);
        
        const guildSubscription = this.stompClient.subscribe(destination, (message) => {
          try {
            console.log(`[ChatWebSocketService] Received guild message for guild ${guildId}:`, message.body);
            let data = JSON.parse(message.body);
            
            // Ensure we have chatType and guildId in the message data
            // These are critical for routing messages correctly
            if (!data.chatType) {
              data.chatType = 'GUILD';
            }
            
            if (!data.guildId) {
              data.guildId = guildId;
            }
            
            // Create a new object to avoid modifying the original data
            const enhancedData = { 
              ...data, 
              chatType: 'GUILD', 
              guildId: guildId 
            };
            
            console.log(`[ChatWebSocketService] Enhanced guild message:`, enhancedData);
            
            // Notify listeners via both subscription mechanism and event system
            subs.forEach(sub => {
              if (sub.callback) {
                try {
                  sub.callback(enhancedData);
                } catch (callbackError) {
                  console.error(`[ChatWebSocketService] Error in guild ${guildId} callback:`, callbackError);
                }
              }
            });
            
            // Also notify via event system
            this.notifyHandlers('CHAT_MESSAGE', enhancedData);
            this.notifyHandlers('onChatMessage', enhancedData);
          } catch (err) {
            console.error(`[ChatWebSocketService] Error processing guild message for guild ${guildId}:`, err);
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
        console.log(`[ChatWebSocketService] Setting up ${subs.length} duel chat subscriptions for battle ${battleId}`);
        const destination = `/topic/chat/duel.${battleId}`;
        console.log(`[ChatWebSocketService] Subscribing to: ${destination}`);
        
        const duelSubscription = this.stompClient.subscribe(destination, (message) => {
          try {
            console.log(`[ChatWebSocketService] Received duel message for battle ${battleId}:`, message.body);
            const data = JSON.parse(message.body);
            
            // Notify listeners via both subscription mechanism and event system
            subs.forEach(sub => {
              if (sub.callback) sub.callback(data);
            });
            
            // Add chat type to help identify the message source
            this.notifyHandlers('CHAT_MESSAGE', { ...data, chatType: 'FIGHT', battleId });
            this.notifyHandlers('onChatMessage', { ...data, chatType: 'FIGHT', battleId });
          } catch (err) {
            console.error(`[ChatWebSocketService] Error processing duel message for battle ${battleId}:`, err);
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
          // Updated paths to match server's broadcast destination
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
          console.log(`[ChatWebSocketService] Setting up delete event subscription for ${key} at ${destination}`);
          
          const deleteSubscription = this.stompClient.subscribe(destination, (message) => {
            try {
              console.log(`[ChatWebSocketService] Received delete event for ${key}:`, message.body);
              const data = JSON.parse(message.body);
              const messageId = data.messageId || data.id;
              const transactionId = data.transactionId || `ws-delete-${messageId}-${Date.now()}`;
              
              if (this.hasProcessedTransaction(transactionId)) {
                console.log(`[ChatWebSocketService] Skipping already processed delete transaction: ${transactionId}`);
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
              
              // Also notify via event system
              this.notifyHandlers('MESSAGE_DELETED', deleteEvent);
              this.notifyHandlers('onMessageDeleted', deleteEvent);
            } catch (err) {
              console.error(`[ChatWebSocketService] Error processing delete event for ${key}:`, err);
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

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        this.connected = false;
        clearInterval(this.reconnectInterval);
        window.dispatchEvent(new Event('ws:close'));
      });
    }
  }

  /**
   * Schedule a reconnect attempt
   */
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

  /**
   * Check if connected to the WebSocket server
   */
  isConnected() {
    return this.connected && this.stompClient !== null;
  }
  
  /**
   * Manually notify handlers about an event
   */
  notifyHandlers(eventType, eventData) {
    console.log(`[ChatWebSocketService] Notifying handlers for event: ${eventType}`, eventData);
    
    // Enhancement: Add chatType if it's missing but we can infer it
    if (eventData) {
      // Check if chatType is missing but we have guildId or roomType is GUILD
      if (!eventData.chatType && (eventData.guildId || (eventData.roomType === 'GUILD'))) {
        eventData.chatType = 'GUILD';
        console.log(`[ChatWebSocketService] Added missing chatType=GUILD to event data`);
      }
      
      // If it has a roomId and roomId starts with "guild-" then it's a guild chat
      if (!eventData.chatType && eventData.roomId && eventData.roomId.toString().startsWith('guild-')) {
        eventData.chatType = 'GUILD';
        // Extract guildId from roomId if possible
        if (!eventData.guildId) {
          const guildIdMatch = eventData.roomId.toString().match(/guild-(\d+)/);
          if (guildIdMatch && guildIdMatch[1]) {
            eventData.guildId = guildIdMatch[1];
            console.log(`[ChatWebSocketService] Extracted guildId=${eventData.guildId} from roomId`);
          }
        }
      }
    }
    
    // Handle delete events
    if (eventType === 'onMessageDeleted' && eventData) {
      const key = 
        eventData.chatType === 'GLOBAL' || eventData.chatType === 'global' ? 'global' : 
        eventData.chatType === 'GUILD' || eventData.chatType === 'guild' ? `guild_${eventData.roomId}` : 
        eventData.chatType === 'FIGHT' || eventData.chatType === 'DUEL' || eventData.chatType === 'duel' ? `duel_${eventData.roomId}` : 
        null;
      
      if (key && this.subscribers.delete[key]) {
        this.subscribers.delete[key].forEach(sub => {
          if (sub.callback) sub.callback(eventData);
        });
      }
    }
    
    // Enhancement: Also notify guild subscribers for chat messages 
    if ((eventType === 'CHAT_MESSAGE' || eventType === 'onChatMessage') && 
        eventData && 
        (eventData.chatType === 'GUILD' || eventData.chatType === 'guild')) {
      
      // Get the specific guild ID
      const guildId = eventData.guildId || (eventData.roomId?.toString().match(/guild-(\d+)/)?.[1]);
      
      if (guildId && this.subscribers.guild[guildId]) {
        console.log(`[ChatWebSocketService] Notifying ${this.subscribers.guild[guildId].length} guild subscribers for guild ${guildId}`);
        this.subscribers.guild[guildId].forEach(sub => {
          if (sub.callback) {
            try {
              // Ensure message has the correct guildId
              const enhancedData = {
                ...eventData,
                guildId: guildId,
                chatType: 'GUILD'
              };
              sub.callback(enhancedData);
            } catch (err) {
              console.error(`[ChatWebSocketService] Error in guild ${guildId} callback:`, err);
            }
          }
        });
      } else {
        console.log(`[ChatWebSocketService] No subscribers found for guild ${guildId || 'unknown'}`);
        
        // For debugging, list all registered guild subscribers
        console.log(`[ChatWebSocketService] All guild subscribers:`, Object.keys(this.subscribers.guild));
      }
    }
    
    // Notify registered event handlers
    if (this.eventHandlers[eventType]) {
      console.log(`[ChatWebSocketService] Found ${this.eventHandlers[eventType].length} handlers for ${eventType}`);
      this.eventHandlers[eventType].forEach(handler => {
        try {
          handler.callback(eventData);
        } catch (err) {
          console.error(`[ChatWebSocketService] Error in ${eventType} handler:`, err);
        }
      });
    }
  }
  
  /**
   * Add an event handler
   */
  addHandler(eventType, callback) {
    if (!callback || typeof callback !== 'function') {
      console.error(`[ChatWebSocketService] Invalid callback for event type: ${eventType}`);
      return null;
    }
    
    // Initialize handlers array if it doesn't exist
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }
    
    const handlerId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.eventHandlers[eventType].push({
      id: handlerId,
      callback
    });
    
    console.log(`[ChatWebSocketService] Added handler for ${eventType}, id: ${handlerId}, total handlers: ${this.eventHandlers[eventType].length}`);
    
    return handlerId;
  }
  
  /**
   * Remove an event handler
   */
  removeHandler(handlerId) {
    if (!handlerId) return false;
    
    let removed = false;
    
    // Search through all event types for the handler
    Object.keys(this.eventHandlers).forEach(eventType => {
      const handlers = this.eventHandlers[eventType];
      const index = handlers.findIndex(h => h.id === handlerId);
      
      if (index !== -1) {
        handlers.splice(index, 1);
        removed = true;
        console.log(`[ChatWebSocketService] Removed handler ${handlerId} from ${eventType}, remaining: ${handlers.length}`);
      }
    });
    
    return removed;
  }

  /**
   * Subscribe to global chat
   */
  subscribeToGlobalChat(callback) {
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    if (callback) {
      this.subscribers.global.push({
        callback,
        subscription: dummySubscription
      });
    }

    if (!this.connected) {
      if (!this.isAttemptingConnection) {
        this.connect()
          .then(() => {
            if (this.stompClient) {
              // Updated path to match server's broadcast destination
              const realSubscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
                try {
                  const data = JSON.parse(message.body);
                  this.subscribers.global.forEach(sub => {
                    if (sub.callback) sub.callback(data);
                  });
                } catch (err) {
                  console.error('Error processing message:', err);
                }
              });
              
              this.subscribers.global.forEach(sub => {
                sub.subscription = realSubscription;
                delete sub.subscription.isPending;
              });
            }
          })
          .catch(err => {
            console.warn('Failed to connect for subscription:', err);
          });
      }
      
      // Also subscribe to delete events
      this.subscribeToDeleteEvents('global', null, callback);
      
      return {
        unsubscribe: () => {
          this.subscribers.global = this.subscribers.global.filter(
            (sub) => sub.callback !== callback
          );
        }
      };
    }

    // If connected, create a real subscription right away
    try {
      // Updated path to match server's broadcast destination
      const subscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error('Error processing global message:', err);
        }
      });
      
      this.subscribers.global.push({
        callback,
        subscription
      });
      
      // Also subscribe to delete events
      this.subscribeToDeleteEvents('global', null, callback);
      
      return {
        unsubscribe: () => {
          if (subscription) {
            subscription.unsubscribe();
          }
          
          this.subscribers.global = this.subscribers.global.filter(
            (sub) => sub.callback !== callback
          );
        }
      };
    } catch (error) {
      console.error('Error subscribing to global chat:', error);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Subscribe to guild chat
   */
  subscribeToGuildChat(guildId, callback) {
    if (!guildId) {
      console.error('[ChatWebSocketService] Guild ID is required for guild chat subscription');
      return { unsubscribe: () => {} };
    }
    
    console.log(`[ChatWebSocketService] Subscribing to guild chat for guild ID: ${guildId}`);
    
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    if (!this.subscribers.guild[guildId]) {
      this.subscribers.guild[guildId] = [];
    }
    
    if (callback) {
      this.subscribers.guild[guildId].push({
        callback,
        subscription: dummySubscription
      });
    }

    const handleConnectedSubscription = () => {
      if (!this.stompClient) {
        console.warn(`[ChatWebSocketService] No STOMP client available for guild ${guildId} subscription`);
        return;
      }
      
      // Server logs show the correct path is /topic/chat/guild.{guildId}
      console.log(`[ChatWebSocketService] Creating subscription to /topic/chat/guild.${guildId} for chat messages`);
      
      try {
        const subscription = this.stompClient.subscribe(`/topic/chat/guild.${guildId}`, (message) => {
          try {
            console.log(`[ChatWebSocketService] Received guild message for guild ${guildId}:`, message.body);
            const data = JSON.parse(message.body);
            
            // Check for transactionId to avoid duplicate processing
            if (data.transactionId && this.hasProcessedTransaction(data.transactionId)) {
              console.log(`[ChatWebSocketService] Skipping duplicate guild message transaction: ${data.transactionId}`);
              return;
            }
            
            // Mark this transaction as processed 
            if (data.transactionId) {
              this.markTransactionProcessed(data.transactionId);
            } else if (data.id) {
              // Use messageId as fallback transaction ID
              const fallbackTxId = `guild-msg-${data.id}-${guildId}`;
              if (this.hasProcessedTransaction(fallbackTxId)) {
                console.log(`[ChatWebSocketService] Skipping duplicate guild message by ID: ${data.id}`);
                return;
              }
              this.markTransactionProcessed(fallbackTxId);
            }
            
            // Add guild ID to the data if it's not already there
            if (!data.guildId) {
              data.guildId = guildId;
            }
            
            // Add chat type if missing
            if (!data.chatType) {
              data.chatType = 'GUILD';
            }
            
            console.log(`[ChatWebSocketService] Parsed guild message:`, data);
            
            // Notify all subscribers for this guild
            if (this.subscribers.guild[guildId]) {
              this.subscribers.guild[guildId].forEach(sub => {
                if (sub.callback) {
                  console.log(`[ChatWebSocketService] Calling guild message callback for guild ${guildId}`);
                  // Ensure consistent data format
                  const enhancedData = {
                    ...data,
                    guildId: guildId,
                    chatType: 'GUILD'
                  };
                  sub.callback(enhancedData);
                }
              });
            }
            
            // Also notify through the event system
            this.notifyHandlers('CHAT_MESSAGE', { ...data, chatType: 'GUILD', guildId });
            this.notifyHandlers('onChatMessage', { ...data, chatType: 'GUILD', guildId });
          } catch (err) {
            console.error(`[ChatWebSocketService] Error processing guild message for guild ${guildId}:`, err);
          }
        });
        
        console.log(`[ChatWebSocketService] Created subscription for guild ${guildId}:`, subscription);
        
        // Update the subscriptions list with the real subscription
        if (this.subscribers.guild[guildId]) {
          this.subscribers.guild[guildId].forEach(sub => {
            if (sub.callback === callback) {
              sub.subscription = subscription;
              delete sub.subscription.isPending;
            }
          });
        }
        
        return subscription;
      } catch (error) {
        console.error(`[ChatWebSocketService] Error subscribing to guild chat for guild ${guildId}:`, error);
        return null;
      }
    };

    if (!this.connected) {
      console.log(`[ChatWebSocketService] WebSocket not connected for guild ${guildId}, connecting...`);
      if (!this.isAttemptingConnection) {
        this.connect()
          .then(() => {
            console.log(`[ChatWebSocketService] Connected to WebSocket for guild ${guildId}`);
            handleConnectedSubscription();
          })
          .catch(err => {
            console.warn(`[ChatWebSocketService] Failed to connect for guild ${guildId} subscription:`, err);
          });
      }
      
      // Also subscribe to delete events
      console.log(`[ChatWebSocketService] Setting up delete events subscription for guild ${guildId}`);
      this.subscribeToDeleteEvents('guild', guildId, callback);
      
      return {
        unsubscribe: () => {
          console.log(`[ChatWebSocketService] Unsubscribing from guild ${guildId}`);
          if (this.subscribers.guild[guildId]) {
            this.subscribers.guild[guildId] = this.subscribers.guild[guildId].filter(
              (sub) => sub.callback !== callback
            );
          }
        }
      };
    }

    // If connected, create a real subscription right away
    const subscription = handleConnectedSubscription();
    
    // Also subscribe to delete events
    console.log(`[ChatWebSocketService] Setting up delete events subscription for guild ${guildId}`);
    this.subscribeToDeleteEvents('guild', guildId, callback);
    
    return {
      unsubscribe: () => {
        console.log(`[ChatWebSocketService] Unsubscribing from guild ${guildId}`);
        if (subscription) {
          subscription.unsubscribe();
        }
        
        if (this.subscribers.guild[guildId]) {
          this.subscribers.guild[guildId] = this.subscribers.guild[guildId].filter(
            (sub) => sub.callback !== callback
          );
        }
      }
    };
  }

  /**
   * Subscribe to duel chat
   */
  subscribeToDuelChat(battleId, callback) {
    if (!battleId) {
      console.error('Battle ID is required for duel chat subscription');
      return { unsubscribe: () => {} };
    }
    
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    if (!this.subscribers.duel[battleId]) {
      this.subscribers.duel[battleId] = [];
    }
    
    if (callback) {
      this.subscribers.duel[battleId].push({
        callback,
        subscription: dummySubscription
      });
    }

    if (!this.connected) {
      if (!this.isAttemptingConnection) {
        this.connect()
          .then(() => {
            if (this.stompClient) {
              const realSubscription = this.stompClient.subscribe(`/topic/chat/duel.${battleId}`, (message) => {
                try {
                  const data = JSON.parse(message.body);
                  this.subscribers.duel[battleId].forEach(sub => {
                    if (sub.callback) sub.callback(data);
                  });
                } catch (err) {
                  console.error(`Error processing duel message for battle ${battleId}:`, err);
                }
              });
              
              this.subscribers.duel[battleId].forEach(sub => {
                sub.subscription = realSubscription;
                delete sub.subscription.isPending;
              });
            }
          })
          .catch(err => {
            console.warn(`Failed to connect for duel ${battleId} subscription:`, err);
          });
      }
      
      // Also subscribe to delete events
      this.subscribeToDeleteEvents('duel', battleId, callback);
      
      return {
        unsubscribe: () => {
          if (this.subscribers.duel[battleId]) {
            this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
              (sub) => sub.callback !== callback
            );
          }
        }
      };
    }

    // If connected, create a real subscription right away
    try {
      const subscription = this.stompClient.subscribe(`/topic/chat/duel.${battleId}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error(`Error processing duel message for battle ${battleId}:`, err);
        }
      });
      
      this.subscribers.duel[battleId].push({
        callback,
        subscription
      });
      
      // Also subscribe to delete events
      this.subscribeToDeleteEvents('duel', battleId, callback);
      
      return {
        unsubscribe: () => {
          if (subscription) {
            subscription.unsubscribe();
          }
          
          if (this.subscribers.duel[battleId]) {
            this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
              (sub) => sub.callback !== callback
            );
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to duel chat for battle ${battleId}:`, error);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Subscribe to delete events
   */
  subscribeToDeleteEvents(chatType, id, callback) {
    if (!callback) {
      return { unsubscribe: () => {} };
    }

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

    const key = chatType === 'global' ? 'global' : `${chatType}_${id}`;
    
    if (!this.subscribers.delete[key]) {
      this.subscribers.delete[key] = [];
    }

    if (!this.connected) {
      const pendingSubscription = {
        unsubscribe: () => {
          if (this.subscribers.delete[key]) {
            this.subscribers.delete[key] = this.subscribers.delete[key].filter(
              (sub) => sub.callback !== callback
            );
          }
        },
        isPending: true
      };
      
      this.subscribers.delete[key].push({
        callback,
        subscription: pendingSubscription
      });
      
      return pendingSubscription;
    }

    try {
      // Create a wrapper that handles deduplication
      const wrappedCallback = (message) => {
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
          
          const deleteEvent = {
            type: 'delete',
            messageId: messageId,
            roomId: data.roomId || id,
            uniqueId: data.uniqueId,
            transactionId: transactionId
          };
          
          callback(deleteEvent);
        } catch (err) {
          console.error(`Error processing delete event for ${chatType} ${id || ''}:`, err);
        }
      };
      
      const subscription = this.stompClient.subscribe(destination, wrappedCallback);

      this.subscribers.delete[key].push({
        callback,
        subscription,
        wrappedCallback
      });

      return {
        unsubscribe: () => {
          if (subscription) {
            subscription.unsubscribe();
          }
          
          if (this.subscribers.delete[key]) {
            this.subscribers.delete[key] = this.subscribers.delete[key].filter(
              (sub) => sub.callback !== callback
            );
          }
        }
      };
    } catch (error) {
      console.error(`Error subscribing to delete events for ${chatType} ${id || ''}:`, error);
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Send a chat message through WebSocket
   */
  sendMessage(messageData) {
    if (!this.connected || !this.stompClient) {
      console.error('[ChatWebSocketService] Cannot send message: WebSocket not connected');
      return Promise.reject(new Error('WebSocket not connected'));
    }
    
    // Generate a transaction ID if not provided
    if (!messageData.transactionId) {
      messageData.transactionId = `ws-send-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    
    // Mark our own transaction as processed to avoid echo
    this.markTransactionProcessed(messageData.transactionId);
    
    console.log(`[ChatWebSocketService] Sending message:`, messageData);
    
    // Determine destination based on chat type
    let destination = '/app/chat';
    
    if (messageData.chatType === 'GUILD' && messageData.guildId) {
      destination = `/app/chat/guild/${messageData.guildId}`;
      console.log(`[ChatWebSocketService] Using guild chat destination: ${destination}`);
    } else if (messageData.chatType === 'FIGHT' || messageData.chatType === 'DUEL') {
      destination = `/app/chat/duel/${messageData.roomId || messageData.battleId}`;
      console.log(`[ChatWebSocketService] Using duel chat destination: ${destination}`);
    }
    
    console.log(`[ChatWebSocketService] Sending to destination: ${destination}`);
    
    // Add timestamp if not provided
    if (!messageData.timestamp) {
      messageData.timestamp = new Date().toISOString();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.stompClient.send(
          destination,
          {}, // Headers
          JSON.stringify(messageData)
        );
        console.log('[ChatWebSocketService] Message sent successfully');
        resolve(messageData);
      } catch (error) {
        console.error('[ChatWebSocketService] Failed to send message:', error);
        reject(error);
      }
    });
  }

  /**
   * Delete a message via WebSocket
   */
  deleteMessage(data) {
    if (!this.connected || !this.stompClient) {
      return Promise.reject(new Error('Not connected to WebSocket server'));
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('[ChatWebSocketService] Sending delete message:', data);
        this.stompClient.send('/app/chat.deleteMessage', {}, JSON.stringify(data));
        console.log('[ChatWebSocketService] Delete message sent');
        resolve();
      } catch (error) {
        console.error('[ChatWebSocketService] Error sending delete request via WebSocket:', error);
        reject(error);
      }
    });
  }
}

export default new ChatWebSocketService();