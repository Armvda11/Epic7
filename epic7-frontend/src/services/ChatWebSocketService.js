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
    
    // Add a processed transactions cache to avoid duplicate event processing
    this.processedTransactions = new Set();
    // Keep track of when transactions were processed (for cleanup)
    this.transactionTimestamps = new Map();
    // Set up a timer to clean old transaction records periodically
    setInterval(this.cleanupOldTransactions.bind(this), 60000); // Check every minute
  }
  
  /**
   * Check if a transaction has already been processed
   * @param {string} transactionId - The unique ID for the transaction
   * @returns {boolean} True if already processed, false otherwise
   */
  hasProcessedTransaction(transactionId) {
    return this.processedTransactions.has(transactionId);
  }
  
  /**
   * Mark a transaction as processed and store the timestamp
   * @param {string} transactionId - The unique ID for the transaction
   */
  markTransactionProcessed(transactionId) {
    this.processedTransactions.add(transactionId);
    this.transactionTimestamps.set(transactionId, Date.now());
  }
  
  /**
   * Clean up old transaction records to prevent memory leaks
   * Only keeps transactions from the last 5 minutes
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
    
    // If the set gets too large, trim it regardless of timestamps
    const maxTransactions = 1000;
    if (this.processedTransactions.size > maxTransactions) {
      // Sort by timestamp (oldest first) and keep only the newest 500
      const sortedTransactions = [...this.transactionTimestamps.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, this.processedTransactions.size - 500);
      
      // Remove the oldest transactions
      for (const [transactionId] of sortedTransactions) {
        this.processedTransactions.delete(transactionId);
        this.transactionTimestamps.delete(transactionId);
      }
    }
    
    console.log(`[WebSocket] Cleaned up transaction cache. Current size: ${this.processedTransactions.size}`);
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise} A promise that resolves when the connection is established
   */
  connect() {
    // If already connected, just resolve immediately
    if (this.connected && this.stompClient) {
      console.log('Already connected to WebSocket chat server');
      return Promise.resolve();
    }
    
    // If we're already attempting a connection, return a promise that resolves
    // when the current connection attempt completes
    if (this.isAttemptingConnection) {
      console.log('Connection attempt already in progress, waiting for it to complete');
      return new Promise((resolve, reject) => {
        const checkConnection = setInterval(() => {
          if (this.connected) {
            clearInterval(checkConnection);
            resolve();
          } else if (!this.isAttemptingConnection) {
            // If the attempt completed but we're not connected, it failed
            clearInterval(checkConnection);
            reject(new Error('Connection attempt failed'));
          }
          // Otherwise keep waiting
        }, 100);
        
        // Set a timeout to avoid waiting forever
        setTimeout(() => {
          clearInterval(checkConnection);
          this.isAttemptingConnection = false;
          if (!this.connected) {
            console.warn('Connection attempt timed out, will operate in fallback mode');
            reject(new Error('Connection attempt timed out'));
          }
        }, 3000); // Reduced timeout from 5000ms to 3000ms
      });
    }
    
    // Set connection attempt flag
    this.isAttemptingConnection = true;
    
    return new Promise((resolve, reject) => {
      try {
        // Check if user is authenticated
        if (!isAuthenticated()) {
          console.log('Not attempting WebSocket connection - user not authenticated');
          this.isAttemptingConnection = false;
          reject(new Error('User not authenticated'));
          return;
        }

        const token = getToken();
        if (!token) {
          console.log('Not attempting WebSocket connection - no token available');
          this.isAttemptingConnection = false;
          reject(new Error('No authentication token found'));
          return;
        }

        // Create a function that returns a new SockJS instance
        // This allows Stomp to reconnect properly
        const socketFactory = () => {
          // Create proper backend URL - important to use absolute URL instead of relative
          const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
          const wsEndpoint = `${backendUrl}/ws-chat`;
          
          console.log(`Connecting to WebSocket endpoint: ${wsEndpoint} with token`);
          
          // Add a query parameter with the token to avoid CORS preflight issues
          // This is more reliable than headers for WebSocket connections across browsers
          const sockJsUrl = `${wsEndpoint}?token=${encodeURIComponent(token)}`;
          
          // Create SockJS instance with additional options for better connection handling
          return new SockJS(sockJsUrl, null, {
            transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
            timeout: 5000, // Shorter timeout for faster fallback
            debug: true
          });
        };

        // Use the factory function with Stomp.over
        this.stompClient = Stomp.over(socketFactory);
        
        // Properly configure debug - empty function prevents "debug is not a function" error
        this.stompClient.debug = () => {};

        // Connect with JWT token in headers
        const connectHeaders = { 
          // Include token in headers as well for redundancy
          'Authorization': `Bearer ${token}`,
          'X-Auth-Token': token
        };
        
        console.log('Connecting to WebSocket with auth token');
        
        this.stompClient.connect(
          connectHeaders,
          () => {
            console.log('Connected to WebSocket chat server');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.isAttemptingConnection = false;
            clearInterval(this.reconnectInterval);
            
            // Dispatch a connection open event
            window.dispatchEvent(new Event('ws:open'));
            
            // Set up all pending subscriptions
            this.setupPendingSubscriptions();
            
            resolve();
          },
          (error) => {
            console.error('Error connecting to WebSocket server:', error);
            this.connected = false;
            this.isAttemptingConnection = false;
            
            // Dispatch a connection error event
            window.dispatchEvent(new Event('ws:error'));
            
            this.scheduleReconnect();
            reject(error);
          }
        );
      } catch (error) {
        console.error('Exception during WebSocket connection setup:', error);
        this.connected = false;
        this.isAttemptingConnection = false;
        
        // Dispatch a connection error event
        window.dispatchEvent(new Event('ws:error'));
        
        reject(error);
      }
    });
  }
  
  /**
   * Set up all pending subscriptions when connection is established
   */
  setupPendingSubscriptions() {
    // Set up global chat subscriptions
    if (this.subscribers.global.length > 0) {
      console.log(`Setting up ${this.subscribers.global.length} pending global chat subscriptions`);
      const globalSubscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
        try {
          const data = JSON.parse(message.body);
          // Notify all global chat subscribers
          this.subscribers.global.forEach(sub => {
            if (sub.callback) sub.callback(data);
          });
        } catch (err) {
          console.error('Error processing global message:', err);
        }
      });
      
      // Update all global subscriptions
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
        console.log(`Setting up ${subs.length} pending guild chat subscriptions for guild ${guildId}`);
        const guildSubscription = this.stompClient.subscribe(`/topic/chat/guild.${guildId}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            // Notify all subscribers for this guild
            subs.forEach(sub => {
              if (sub.callback) sub.callback(data);
            });
          } catch (err) {
            console.error(`Error processing guild message for guild ${guildId}:`, err);
          }
        });
        
        // Update all subscriptions for this guild
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
        console.log(`Setting up ${subs.length} pending duel chat subscriptions for battle ${battleId}`);
        const duelSubscription = this.stompClient.subscribe(`/topic/chat/duel.${battleId}`, (message) => {
          try {
            const data = JSON.parse(message.body);
            // Notify all subscribers for this duel
            subs.forEach(sub => {
              if (sub.callback) sub.callback(data);
            });
          } catch (err) {
            console.error(`Error processing duel message for battle ${battleId}:`, err);
          }
        });
        
        // Update all subscriptions for this duel
        subs.forEach(sub => {
          if (sub.subscription && sub.subscription.isPending) {
            sub.subscription = duelSubscription;
          }
        });
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
        console.log('Disconnected from WebSocket chat server');
        
        // Dispatch a connection close event
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
        console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
        this.reconnectAttempts++;
        this.connect().catch(() => {
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Maximum reconnect attempts reached');
            clearInterval(this.reconnectInterval);
          }
        });
      }, 5000);
    }
  }

  /**
   * Subscribe to global chat
   * @param {Function} callback Function to call when a message is received
   * @returns {Object} Subscription object with an unsubscribe method
   */
  subscribeToGlobalChat(callback) {
    // Create a dummy subscription object that will be replaced when connected
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    // Store the callback even if not connected - we'll use it for manual notifications
    if (callback) {
      this.subscribers.global.push({
        callback,
        subscription: dummySubscription
      });
    }

    if (!this.connected) {
      console.warn('Not connected to WebSocket server - subscription will be pending until connected');
      
      // Try to connect if not already trying
      if (!this.isAttemptingConnection) {
        console.log('Attempting to connect before subscribing...');
        this.connect()
          .then(() => {
            console.log('Connected successfully, now subscribing properly');
            // Replace dummy subscription with real one for all callbacks
            if (this.stompClient) {
              const realSubscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
                try {
                  const data = JSON.parse(message.body);
                  // Broadcast to all callbacks matching this destination
                  this.subscribers.global.forEach(sub => {
                    if (sub.callback) sub.callback(data);
                  });
                } catch (err) {
                  console.error('Error processing message:', err);
                }
              });
              
              // Update all subscriptions for this destination
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
      
      // Also subscribe to typing and delete events when connected
      return {
        unsubscribe: () => {
          this.subscribers.global = this.subscribers.global.filter(
            (sub) => sub.callback !== callback
          );
        },
        isPending: true
      };
    }

    // If connected, create a real subscription
    const subscription = this.stompClient.subscribe('/topic/chat/global', (message) => {
      try {
        const data = JSON.parse(message.body);
        if (callback) callback(data);
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });

    // Also subscribe to typing and delete events
    this.subscribeToTypingEvents('global', null, callback);
    this.subscribeToDeleteEvents('global', null, callback);

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        this.subscribers.global = this.subscribers.global.filter(
          (sub) => sub.callback !== callback
        );
      }
    };
  }

  /**
   * Subscribe to guild chat
   * @param {Number} guildId Guild ID
   * @param {Function} callback Function to call when a message is received
   * @returns {Object} Subscription object with an unsubscribe method
   */
  subscribeToGuildChat(guildId, callback) {
    // Create a dummy subscription object that will be replaced when connected
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    // Store the callback even if not connected
    if (callback) {
      if (!this.subscribers.guild[guildId]) {
        this.subscribers.guild[guildId] = [];
      }
      this.subscribers.guild[guildId].push({
        callback,
        subscription: dummySubscription
      });
    }

    if (!this.connected) {
      console.warn(`Not connected to WebSocket server - guild chat subscription for guild ${guildId} will be pending until connected`);
      
      // Try to connect if not already trying
      if (!this.isAttemptingConnection) {
        console.log('Attempting to connect before subscribing to guild chat...');
        this.connect()
          .then(() => {
            console.log(`Connected successfully, now subscribing properly to guild ${guildId}`);
            // Replace dummy subscription with real one for all callbacks
            if (this.stompClient) {
              const destination = `/topic/chat/guild.${guildId}`;
              const realSubscription = this.stompClient.subscribe(destination, (message) => {
                try {
                  const data = JSON.parse(message.body);
                  // Broadcast to all callbacks matching this destination
                  if (this.subscribers.guild[guildId]) {
                    this.subscribers.guild[guildId].forEach(sub => {
                      if (sub.callback) sub.callback(data);
                    });
                  }
                } catch (err) {
                  console.error('Error processing guild message:', err);
                }
              });
              
              // Update all subscriptions for this destination
              if (this.subscribers.guild[guildId]) {
                this.subscribers.guild[guildId].forEach(sub => {
                  sub.subscription = realSubscription;
                  delete sub.subscription.isPending;
                });
              }
              
              // Also subscribe to typing and delete events
              this.subscribeToTypingEvents('guild', guildId, callback);
              this.subscribeToDeleteEvents('guild', guildId, callback);
            }
          })
          .catch(err => {
            console.warn(`Failed to connect for guild subscription ${guildId}:`, err);
          });
      }
      
      return {
        unsubscribe: () => {
          if (this.subscribers.guild[guildId]) {
            this.subscribers.guild[guildId] = this.subscribers.guild[guildId].filter(
              (sub) => sub.callback !== callback
            );
          }
        },
        isPending: true
      };
    }

    // If connected, create a real subscription
    const destination = `/topic/chat/guild.${guildId}`;
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        if (callback) callback(data);
      } catch (err) {
        console.error('Error processing guild message:', err);
      }
    });

    // Also subscribe to typing and delete events
    this.subscribeToTypingEvents('guild', guildId, callback);
    this.subscribeToDeleteEvents('guild', guildId, callback);

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
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
   * @param {Number} battleId Battle ID
   * @param {Function} callback Function to call when a message is received
   * @returns {Object} Subscription object with an unsubscribe method
   */
  subscribeToDuelChat(battleId, callback) {
    // Create a dummy subscription object that will be replaced when connected
    const dummySubscription = {
      unsubscribe: () => {},
      isPending: true
    };

    // Store the callback even if not connected
    if (callback) {
      if (!this.subscribers.duel[battleId]) {
        this.subscribers.duel[battleId] = [];
      }
      this.subscribers.duel[battleId].push({
        callback,
        subscription: dummySubscription
      });
    }

    if (!this.connected) {
      console.warn(`Not connected to WebSocket server - duel chat subscription for battle ${battleId} will be pending until connected`);
      
      // Try to connect if not already trying
      if (!this.isAttemptingConnection) {
        console.log('Attempting to connect before subscribing to duel chat...');
        this.connect()
          .then(() => {
            console.log(`Connected successfully, now subscribing properly to duel ${battleId}`);
            // Replace dummy subscription with real one for all callbacks
            if (this.stompClient) {
              const destination = `/topic/chat/duel.${battleId}`;
              const realSubscription = this.stompClient.subscribe(destination, (message) => {
                try {
                  const data = JSON.parse(message.body);
                  // Broadcast to all callbacks matching this destination
                  if (this.subscribers.duel[battleId]) {
                    this.subscribers.duel[battleId].forEach(sub => {
                      if (sub.callback) sub.callback(data);
                    });
                  }
                } catch (err) {
                  console.error('Error processing duel message:', err);
                }
              });
              
              // Update all subscriptions for this destination
              if (this.subscribers.duel[battleId]) {
                this.subscribers.duel[battleId].forEach(sub => {
                  sub.subscription = realSubscription;
                  delete sub.subscription.isPending;
                });
              }
              
              // Also subscribe to typing and delete events
              this.subscribeToTypingEvents('duel', battleId, callback);
              this.subscribeToDeleteEvents('duel', battleId, callback);
            }
          })
          .catch(err => {
            console.warn(`Failed to connect for duel subscription ${battleId}:`, err);
          });
      }
      
      return {
        unsubscribe: () => {
          if (this.subscribers.duel[battleId]) {
            this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
              (sub) => sub.callback !== callback
            );
          }
        },
        isPending: true
      };
    }

    // If connected, create a real subscription
    const destination = `/topic/chat/duel.${battleId}`;
    const subscription = this.stompClient.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        if (callback) callback(data);
      } catch (err) {
        console.error('Error processing duel message:', err);
      }
    });

    // Also subscribe to typing and delete events
    this.subscribeToTypingEvents('duel', battleId, callback);
    this.subscribeToDeleteEvents('duel', battleId, callback);

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        if (this.subscribers.duel[battleId]) {
          this.subscribers.duel[battleId] = this.subscribers.duel[battleId].filter(
            (sub) => sub.callback !== callback
          );
        }
      }
    };
  }

  /**
   * Subscribe to typing events for a specific chat type
   * @param {String} chatType Type of chat ('global', 'guild', or 'duel')
   * @param {Number} id Guild ID or Battle ID (null for global)
   * @param {Function} callback Function to call when a typing event is received
   * @returns {Object} Subscription object with an unsubscribe method
   */
  subscribeToTypingEvents(chatType, id, callback) {
    if (!this.connected) {
      return { unsubscribe: () => {} };
    }

    let destination;
    if (chatType === 'global') {
      destination = '/topic/chat/global/typing';
    } else if (chatType === 'guild') {
      destination = `/topic/chat/guild.${id}/typing`;
    } else if (chatType === 'duel') {
      destination = `/topic/chat/duel.${id}/typing`;
    } else {
      return { unsubscribe: () => {} };
    }

    const subscription = this.stompClient.subscribe(destination, (message) => {
      const data = JSON.parse(message.body);
      if (callback) callback({ type: 'typing', user: data.user, typing: data.typing });
    });

    const key = chatType === 'global' ? 'global' : `${chatType}_${id}`;
    if (!this.subscribers.typing[key]) {
      this.subscribers.typing[key] = [];
    }
    this.subscribers.typing[key].push({
      callback,
      subscription
    });

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        if (this.subscribers.typing[key]) {
          this.subscribers.typing[key] = this.subscribers.typing[key].filter(
            (sub) => sub.callback !== callback
          );
        }
      }
    };
  }

  /**
   * Subscribe to delete events for a specific chat type
   * @param {String} chatType Type of chat ('global', 'guild', or 'duel')
   * @param {Number} id Guild ID or Battle ID (null for global)
   * @param {Function} callback Function to call when a delete event is received
   * @returns {Object} Subscription object with an unsubscribe method
   */
  subscribeToDeleteEvents(chatType, id, callback) {
    if (!callback) {
      console.warn('[WebSocket] No callback provided for delete events subscription');
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
      console.warn(`[WebSocket] Unknown chat type: ${chatType} for delete events subscription`);
      return { unsubscribe: () => {} };
    }

    const key = chatType === 'global' ? 'global' : `${chatType}_${id}`;
    
    // Add the subscription to our internal tracking
    if (!this.subscribers.delete[key]) {
      this.subscribers.delete[key] = [];
    }

    // If not connected, store the callback and return a dummy subscription
    if (!this.connected) {
      console.log(`[WebSocket] Not connected, storing delete event callback for ${chatType} ${id || ''} for later`);
      
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

    // Log subscription attempt
    console.log(`Subscribing to delete events for ${chatType} ${id || ''} at ${destination}`);

    try {
      // Create a wrapper callback that handles transaction IDs and deduplication
      const wrappedCallback = (message) => {
        try {
          // Create a standardized delete event object
          console.log(`[WebSocket] Received delete event from ${destination}:`, message.body);
          const data = JSON.parse(message.body);
          
          // Explicitly log the full received delete message
          console.log(`[WebSocket] Parsed delete event:`, data);
          
          // Extract message ID and transaction ID
          // Support both messageId and id fields for compatibility
          const messageId = data.messageId || data.id;
          const transactionId = data.transactionId || `ws-delete-${messageId}-${Date.now()}`;
          
          // Check if we've already processed this transaction
          if (this.hasProcessedTransaction(transactionId)) {
            console.log(`[WebSocket] Skipping already processed delete transaction: ${transactionId}`);
            return;
          }
          
          // Also check for recent processing of the same message ID as a backup
          const recentKey = `recent-${messageId}`;
          if (messageId && this.hasProcessedTransaction(recentKey)) {
            console.log(`[WebSocket] Skipping recently processed message ID: ${messageId}`);
            return;
          }
          
          // Mark this transaction as processed
          this.markTransactionProcessed(transactionId);
          if (messageId) {
            this.markTransactionProcessed(recentKey); // Mark message ID as recently processed
          }
          
          // Standardize the delete event format and explicitly set the type
          let deleteEvent;
          
          // If data already has type field, use it as is
          if (data.type === 'delete') {
            deleteEvent = {
              ...data,
              // Ensure these fields are always present and correctly formatted
              type: 'delete',
              messageId: messageId,
              roomId: data.roomId || id,
              transactionId: transactionId
            };
          } else {
            // Otherwise create a new object with the type field
            deleteEvent = {
              type: 'delete',
              messageId: messageId,
              roomId: data.roomId || id,
              uniqueId: data.uniqueId, // Include uniqueId if available
              sender: data.sender, // Include sender information for logging
              transactionId: transactionId,
              chatType: chatType.toUpperCase() // Include chat type
            };
          }
          
          // Log detailed info about the event
          console.log(`[WebSocket] Processing delete event for message: ${deleteEvent.messageId}, uniqueId: ${deleteEvent.uniqueId || 'not provided'}, roomId: ${deleteEvent.roomId}, sender: ${deleteEvent.sender || 'unknown'}, transactionId: ${transactionId}`);
          
          // Call the provided callback with the standardized event
          if (callback) {
            console.log(`[WebSocket] Calling delete callback for message: ${deleteEvent.messageId}`);
            callback(deleteEvent);
          } else {
            console.warn(`[WebSocket] No callback provided for delete event: ${deleteEvent.messageId}`);
          }
          
        } catch (err) {
          console.error(`Error processing delete event for ${chatType} ${id || ''}:`, err, message.body);
        }
      };
      
      // Create STOMP subscription
      const subscription = this.stompClient.subscribe(destination, wrappedCallback);

      // Store subscription for cleanup
      this.subscribers.delete[key].push({
        callback,
        subscription,
        wrappedCallback // Store the wrapped callback for reference
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
      // Return a dummy subscription object
      return { unsubscribe: () => {} };
    }
  }

  /**
   * Send a message to a chat room
   * @param {Object} message Message object with roomId and content
   */
  sendMessage(message) {
    // Don't attempt to send messages via WebSocket if not connected
    if (!this.connected) {
      console.error('Not connected to WebSocket server');
      return Promise.reject(new Error('Not connected to WebSocket server'));
    }

    // Get the current user from localStorage
    const userData = localStorage.getItem('userData');
    const currentUser = userData ? JSON.parse(userData) : null;
    
    // Determine chat type based on roomId or explicit type
    let chatType = message.chatType || 'GLOBAL';
    if (!chatType) {
      // Try to infer chat type from roomId
      if (typeof message.roomId === 'string') {
        if (message.roomId.startsWith('guild-')) {
          chatType = 'GUILD';
        } else if (message.roomId.startsWith('fight-') || message.roomId.startsWith('duel-')) {
          chatType = 'FIGHT';
        }
      }
    }
    
    // Add a unique ID to prevent duplicates and help with tracking
    const messageWithId = {
      ...message,
      clientId: `client-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      // Store the current user ID to identify own messages when they come back
      senderId: currentUser?.id,
      fromCurrentUser: true,
      // Include chat type for proper routing
      chatType: chatType
    };

    return new Promise((resolve, reject) => {
      try {
        // Send the message through the STOMP client
        this.stompClient.send(
          '/app/chat.sendMessage',
          { 'content-type': 'application/json' },
          JSON.stringify(messageWithId)
        );
        resolve(messageWithId);
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
      }
    });
  }

  /**
   * Send typing status to a chat room
   * @param {Number} roomId Chat room ID
   * @param {Boolean} isTyping Whether the user is typing
   */
  sendTypingStatus(roomId, isTyping) {
    if (!this.connected) {
      return;
    }

    try {
      this.stompClient.send(
        '/app/chat.typing',
        {},
        JSON.stringify({ roomId, typing: isTyping })
      );
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }

  /**
   * Delete a message
   * @param {Object} messageData - The message data
   * @param {number} messageData.messageId - The ID of the message to delete
   * @param {number} messageData.roomId - The ID of the room the message belongs to
   * @param {string} messageData.uniqueId - The unique identifier of the message
   * @param {string} messageData.transactionId - Unique ID for this delete operation (optional)
   * @returns {Promise} - A promise that resolves when the message is deleted
   */
  deleteMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.stompClient) {
        console.error('[WebSocket] Cannot delete message - not connected to WebSocket');
        reject(new Error('Not connected to WebSocket'));
        return;
      }

      try {
        // Get token to ensure it's sent with delete request
        const token = getToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Get current user information
        const currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        
        // Normalize messageId - could be in messageId or id property
        const messageId = messageData.messageId || messageData.id;
        
        if (!messageId) {
          console.error('[WebSocket] Cannot delete message - no messageId provided');
          reject(new Error('No messageId provided for delete operation'));
          return;
        }
        
        // Create a unique transaction ID if not provided
        // This will be used for deduplication across components
        const transactionId = messageData.transactionId || 
                             `delete-${messageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              
        // Check if we've already processed this transaction
        if (this.hasProcessedTransaction(transactionId)) {
          console.log(`[WebSocket] Skipping already processed delete transaction: ${transactionId}`);
          resolve(true);
          return;
        }
        
        // Mark this transaction as processed
        this.markTransactionProcessed(transactionId);

        // Also mark any transaction with the same messageId in the last few seconds as processed
        // This helps catch nearly-duplicate delete requests with different transaction IDs
        const existingTransactions = [...this.processedTransactions].filter(tid => 
          tid.includes(`delete-${messageId}`) && 
          this.transactionTimestamps.has(tid) && 
          (Date.now() - this.transactionTimestamps.get(tid) < 5000) // Within last 5 seconds
        );
        
        if (existingTransactions.length > 0) {
          console.log(`[WebSocket] Found ${existingTransactions.length} recent transactions for message ${messageId}, this may be a duplicate`);
        }

        // Log delete request with more detail
        console.log(`[WebSocket] Sending delete request for messageId: ${messageId}, roomId: ${messageData.roomId}${messageData.uniqueId ? `, uniqueId: ${messageData.uniqueId}` : ''}, transactionId: ${transactionId}`);

        // Send a properly structured delete message to the server
        this.stompClient.send('/app/chat.deleteMessage', headers, JSON.stringify({
          messageId: messageId,
          roomId: messageData.roomId,
          // Include current user ID in delete request
          askerId: currentUser.id,
          sender: currentUser.username, // Send username as string, not an object
          // Add uniqueId if available for precise message targeting
          uniqueId: messageData.uniqueId,
          // Add a type field to explicitly identify this as a delete message
          type: 'delete',
          // Include transaction ID for deduplication
          transactionId: transactionId
        }));

        // Add a fallback mechanism to ensure the message is deleted locally
        // if the WebSocket broadcast fails or is delayed
        setTimeout(() => {
          // Check if we need to manually broadcast the deletion event
          // This is a fallback in case the server doesn't broadcast it properly
          console.log(`[WebSocket] Sending manual delete fallback for messageId: ${messageId}${messageData.uniqueId ? `, uniqueId: ${messageData.uniqueId}` : ''}, transactionId: ${transactionId}`);
          
          // Create a standardized delete event for consistency with explicit type
          const deleteEvent = {
            type: 'delete', // Explicitly mark as delete message
            messageId: messageId,
            roomId: messageData.roomId,
            uniqueId: messageData.uniqueId,
            sender: currentUser.username,
            transactionId: transactionId // Include transaction ID
          };
          
          // Notify all relevant delete event subscribers
          this.notifyHandlers('onMessageDeleted', deleteEvent);
          
          // Also try to broadcast to the correct destination as a double-fallback
          try {
            // Get the room type from the roomId if possible
            let chatRoom = null;
            let destination = null;
            
            // Try to determine the most appropriate destination
            if (messageData.chatType) {
              // If we already know the chat type
              const chatType = messageData.chatType.toLowerCase();
              
              if (chatType === 'global') {
                destination = '/topic/chat/global/delete';
              } else if (chatType === 'guild') {
                destination = `/topic/chat/guild.${messageData.roomId}/delete`;
              } else if (chatType === 'duel' || chatType === 'fight') {
                destination = `/topic/chat/duel.${messageData.roomId}/delete`;
              }
            }
            
            // If we determined a destination, try to send a fallback broadcast
            if (destination && this.connected && this.stompClient) {
              console.log(`[WebSocket] Attempting second fallback delete broadcast to ${destination}`);
              this.stompClient.send(destination, headers, JSON.stringify(deleteEvent));
            }
          } catch (fallbackError) {
            console.warn('[WebSocket] Error in delete fallback broadcast:', fallbackError);
            // This is a best-effort fallback, so we don't let errors propagate
          }
        }, 500); // Increased timeout to allow server to process first and reduce race conditions
        
        resolve(true);
      } catch (error) {
        console.error('[WebSocket] Error deleting message via WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Cleanup old transaction records to prevent memory leaks
   * Removes transactions older than 10 minutes to balance reliability with memory usage
   */
  cleanupOldTransactions() {
    const now = Date.now();
    const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    // Find expired transactions
    const expiredTransactions = [];
    this.transactionTimestamps.forEach((timestamp, transactionId) => {
      if (now - timestamp > expirationTime) {
        expiredTransactions.push(transactionId);
      }
    });
    
    // Remove expired transactions
    expiredTransactions.forEach(transactionId => {
      this.processedTransactions.delete(transactionId);
      this.transactionTimestamps.delete(transactionId);
    });
    
    if (expiredTransactions.length > 0) {
      console.log(`[WebSocket] Cleaned up ${expiredTransactions.length} expired transactions`);
    }
  }

  /**
   * Check if a transaction has already been processed to avoid duplicates
   * @param {string} transactionId The transaction ID to check
   * @returns {boolean} True if the transaction has already been processed
   */
  hasProcessedTransaction(transactionId) {
    return this.processedTransactions.has(transactionId);
  }
  
  /**
   * Mark a transaction as processed to avoid duplicate processing
   * @param {string} transactionId The transaction ID to mark as processed
   */
  markTransactionProcessed(transactionId) {
    if (!transactionId) return;
    
    this.processedTransactions.add(transactionId);
    this.transactionTimestamps.set(transactionId, Date.now());
    
    // Limit the size of the processed transactions set to prevent memory leaks
    if (this.processedTransactions.size > 1000) {
      const oldestTransaction = Array.from(this.transactionTimestamps.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      
      this.processedTransactions.delete(oldestTransaction);
      this.transactionTimestamps.delete(oldestTransaction);
    }
  }

  /**
   * Check if the connection is established
   * @returns {Boolean} True if connected, false otherwise
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Manually notify message handlers about an event
   * This is a fallback mechanism when WebSocket broadcasts fail
   * @param {String} eventType The type of event ('onChatMessage', 'onMessageDeleted', etc.)
   * @param {any} data The data to pass to handlers
   */
  notifyHandlers(eventType, data) {
    console.log(`[WebSocket] Broadcasting ${eventType} to all subscribers:`, data);
    
    // Don't attempt to broadcast if disconnected
    if (!this.connected && eventType !== 'onClose' && eventType !== 'onError') {
      console.warn(`[WebSocket] Cannot broadcast ${eventType} - not connected`);
      return;
    }
    
    // Special handling for delete events
    if (eventType === 'onMessageDeleted' || eventType === 'MESSAGE_DELETED' || eventType === 'DELETE_MESSAGE') {
      // For delete events, we need both messageId and roomId
      // Support both messageId and id fields for compatibility
      const messageId = data.messageId || data.id;
      const { roomId, uniqueId, sender, transactionId } = data;
      
      if (!messageId) {
        console.warn('[WebSocket] Cannot notify delete handlers: missing messageId', data);
        return;
      }
      
      // If we have a transaction ID, check if we've already processed it
      if (transactionId) {
        if (this.hasProcessedTransaction(transactionId)) {
          console.log(`[WebSocket] Skipping duplicate delete event with transaction ID: ${transactionId}`);
          return;
        }
        // Mark this transaction as processed
        this.markTransactionProcessed(transactionId);
      } else {
        // If no transaction ID, generate one for deduplication
        const generatedTransactionId = `notify-delete-${messageId}-${Date.now()}`;
        data.transactionId = generatedTransactionId;
        
        // Check for any recently processed deletes for this message ID
        let hasRecentDelete = false;
        for (const [existingTransId, timestamp] of this.transactionTimestamps.entries()) {
          // If we've processed a deletion for this message ID in the last 5 seconds
          if (existingTransId.includes(`-${messageId}-`) && 
              Date.now() - timestamp < 5000 &&
              (existingTransId.startsWith('delete-') || existingTransId.startsWith('notify-delete-'))) {
            console.log(`[WebSocket] Found recent delete transaction for message ${messageId}: ${existingTransId}`);
            hasRecentDelete = true;
            break;
          }
        }
        
        if (hasRecentDelete) {
          console.log(`[WebSocket] Multiple delete requests for message ${messageId} in quick succession`);
          // We'll still process it but with this warning
        }
        
        this.markTransactionProcessed(generatedTransactionId);
      }
      
      // Log the uniqueId to ensure it's being passed correctly
      console.log(`[WebSocket] Delete event for messageId ${messageId}${uniqueId ? `, uniqueId ${uniqueId}` : ' (no uniqueId)'}, sender: ${sender || 'unknown'}, transactionId: ${transactionId || data.transactionId}`);
      
      // Create a standardized delete event object
      const deleteEvent = { 
        type: 'delete', // Always set the type explicitly
        messageId,
        id: messageId, // Include as id too for compatibility
        roomId,
        uniqueId, // Include uniqueId if available
        sender,    // Include sender if available
        transactionId: transactionId || data.transactionId, // Include transaction ID for deduplication
        chatType: data.chatType // Include the chat type if available
      };
      
      // Track all keys to broadcast to, including global subscribers
      // We'll broadcast to global by default for maximum reliability
      const keysToNotify = new Set(['global']);
      
      // If we know the room ID
      if (roomId) {
        // Try to determine the correct chat type for this room ID
        let chatType = 'global';
        
        // Use provided chatType if available
        if (data.chatType) {
          chatType = data.chatType.toLowerCase();
        } 
        // Otherwise extract from roomId pattern if possible
        else if (typeof roomId === 'string') {
          if (roomId.startsWith('guild-')) {
            chatType = 'guild';
          } else if (roomId.startsWith('duel-') || roomId.startsWith('fight-')) {
            chatType = 'duel';
          }
        }
        
        // Add type-specific key
        if (chatType === 'guild') {
          keysToNotify.add(`guild_${roomId}`);
        } else if (chatType === 'duel') {
          keysToNotify.add(`duel_${roomId}`);
        }
      }
      
      // Broadcast to all relevant delete subscribers
      keysToNotify.forEach(key => {
        if (this.subscribers.delete[key]) {
          console.log(`[WebSocket] Broadcasting delete event to ${this.subscribers.delete[key].length} subscribers for ${key}`);
          this.subscribers.delete[key].forEach(sub => {
            if (sub.callback) {
              try {
                sub.callback(deleteEvent);
              } catch (err) {
                console.error(`Error calling ${key} delete subscriber callback:`, err);
              }
            }
          });
        } else {
          console.log(`[WebSocket] No subscribers found for key: ${key}`);
        }
      });
      
      return;
    }
    
    if (eventType === 'onChatMessage' || eventType === 'CHAT_MESSAGE' || eventType === 'MESSAGE_SENT') {
      // For chat messages, notify all subscribers that might be interested
      
      // First determine which chat type this message belongs to
      const roomId = data.roomId;
      if (!roomId) {
        console.warn('Cannot notify handlers: message has no roomId', data);
        return;
      }
      
      // Get the chat room type - try to extract it from various properties
      const roomType = data.roomType || 
                      (data.chatRoom && data.chatRoom.type) || 
                      (data.type) ||
                      'GLOBAL'; // Default to GLOBAL if we can't determine
      
      console.log(`Broadcasting message to room type: ${roomType}, roomId: ${roomId}`);
      
      // Force addition of sender info if missing
      if (!data.sender && data.username) {
        data.sender = { username: data.username, id: data.userId };
      }
      
      // Determine if this is a GUILD chat based on roomId or explicit type
      const isGuildChat = 
          roomType === 'GUILD' || 
          (typeof roomId === 'string' && roomId.startsWith('guild-')) ||
          (data.chatType === 'GUILD');
          
      // Determine if this is a FIGHT chat based on roomId or explicit type
      const isFightChat = 
          roomType === 'FIGHT' || 
          roomType === 'DUEL' || 
          (typeof roomId === 'string' && (roomId.startsWith('fight-') || roomId.startsWith('duel-'))) ||
          (data.chatType === 'FIGHT' || data.chatType === 'DUEL');
      
      // Notify global chat subscribers only if it's a global message or if global fallback is enabled
      if (!isGuildChat && !isFightChat && this.subscribers.global.length > 0) {
        console.log(`Broadcasting to ${this.subscribers.global.length} global subscribers`);
        this.subscribers.global.forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(data);
            } catch (err) {
              console.error('Error calling global subscriber callback:', err);
            }
          }
        });
      }
      
      // Then notify room-specific subscribers
      if (isGuildChat && this.subscribers.guild[roomId]) {
        console.log(`Broadcasting to ${this.subscribers.guild[roomId].length} guild subscribers for guild ${roomId}`);
        this.subscribers.guild[roomId].forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(data);
            } catch (err) {
              console.error(`Error calling guild ${roomId} subscriber callback:`, err);
            }
          }
        });
      } else if (isFightChat && this.subscribers.duel[roomId]) {
        console.log(`Broadcasting to ${this.subscribers.duel[roomId].length} duel subscribers for battle ${roomId}`);
        this.subscribers.duel[roomId].forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(data);
            } catch (err) {
              console.error(`Error calling duel ${roomId} subscriber callback:`, err);
            }
          }
        });
      }
    }
    // Add handlers for other event types as needed
  }
}

export default new ChatWebSocketService();