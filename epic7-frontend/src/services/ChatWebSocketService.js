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
    if (!this.connected) {
      return { unsubscribe: () => {} };
    }

    let destination;
    if (chatType === 'global') {
      destination = '/topic/chat/global/delete';
    } else if (chatType === 'guild') {
      destination = `/topic/chat/guild.${id}/delete`;
    } else if (chatType === 'duel') {
      destination = `/topic/chat/duel.${id}/delete`;
    } else {
      return { unsubscribe: () => {} };
    }

    const subscription = this.stompClient.subscribe(destination, (message) => {
      const data = JSON.parse(message.body);
      if (callback) callback({ type: 'delete', messageId: data.messageId });
    });

    const key = chatType === 'global' ? 'global' : `${chatType}_${id}`;
    if (!this.subscribers.delete[key]) {
      this.subscribers.delete[key] = [];
    }
    this.subscribers.delete[key].push({
      callback,
      subscription
    });

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        if (this.subscribers.delete[key]) {
          this.subscribers.delete[key] = this.subscribers.delete[key].filter(
            (sub) => sub.callback !== callback
          );
        }
      }
    };
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
    
    // Add a unique ID to prevent duplicates and help with tracking
    const messageWithId = {
      ...message,
      clientId: `client-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      // Store the current user ID to identify own messages when they come back
      senderId: currentUser?.id,
      fromCurrentUser: true
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
   * @param {Object} deleteMessage Object with messageId and roomId
   */
  deleteMessage(deleteMessage) {
    if (!this.connected) {
      console.error('Not connected to WebSocket server');
      return Promise.reject(new Error('Not connected to WebSocket server'));
    }

    return new Promise((resolve, reject) => {
      try {
        // Add deletion to local tracking to prevent message from being re-added
        if (deleteMessage.messageId) {
          // Create a "deleted messages" set if it doesn't exist
          if (!this.deletedMessages) {
            this.deletedMessages = new Set();
          }
          // Add the message ID to the deleted set
          this.deletedMessages.add(deleteMessage.messageId.toString());
        }

        this.stompClient.send(
          '/app/chat.deleteMessage',
          {},
          JSON.stringify(deleteMessage)
        );
        resolve();
      } catch (error) {
        console.error('Error deleting message:', error);
        reject(error);
      }
    });
  }

  /**
   * Check if a message has been deleted locally
   * @param {string|number} messageId The ID of the message to check
   * @returns {boolean} True if the message was marked as deleted
   */
  isMessageDeleted(messageId) {
    if (!messageId || !this.deletedMessages) return false;
    return this.deletedMessages.has(messageId.toString());
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
    console.log(`Broadcasting ${eventType} to all subscribers:`, data);
    
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
                      'GLOBAL'; // Default to GLOBAL if we can't determine
      
      console.log(`Broadcasting message to room type: ${roomType}, roomId: ${roomId}`);
      
      // Force addition of sender info if missing
      if (!data.sender && data.username) {
        data.sender = { username: data.username, id: data.userId };
      }
      
      // Notify all global chat subscribers always
      // This is important to catch messages across all rooms
      if (this.subscribers.global.length > 0) {
        console.log(`Broadcasting to ${this.subscribers.global.length} global subscribers`);
        this.subscribers.global.forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(data);
            } catch (error) {
              console.error('Error in global subscriber callback:', error);
            }
          }
        });
      }
      
      // Also notify specific room subscribers
      if (roomType === 'GUILD') {
        // Notify guild chat subscribers
        const guildId = data.guildId || (data.chatRoom && data.chatRoom.groupId) || roomId;
        if (this.subscribers.guild[guildId]) {
          console.log(`Broadcasting to ${this.subscribers.guild[guildId].length} guild subscribers for guildId ${guildId}`);
          this.subscribers.guild[guildId].forEach(sub => {
            if (sub.callback) {
              try {
                sub.callback(data);
              } catch (error) {
                console.error('Error in guild subscriber callback:', error);
              }
            }
          });
        }
      } else if (roomType === 'FIGHT' || roomType === 'DUEL') {
        // Notify duel chat subscribers
        const battleId = data.battleId || (data.chatRoom && data.chatRoom.groupId) || roomId;
        if (this.subscribers.duel[battleId]) {
          console.log(`Broadcasting to ${this.subscribers.duel[battleId].length} duel subscribers for battleId ${battleId}`);
          this.subscribers.duel[battleId].forEach(sub => {
            if (sub.callback) {
              try {
                sub.callback(data);
              } catch (error) {
                console.error('Error in duel subscriber callback:', error);
              }
            }
          });
        }
      }
    } else if (eventType === 'onMessageDeleted') {
      // For message deletion, broadcast the messageId to all subscribers
      // We don't know which room it belongs to, so broadcast to all
      
      // Create a delete event object
      const deleteEvent = { type: 'delete', messageId: data };
      console.log('Broadcasting delete event to all subscribers:', deleteEvent);
      
      // Notify global chat subscribers
      this.subscribers.global.forEach(sub => {
        if (sub.callback) {
          try {
            sub.callback(deleteEvent);
          } catch (error) {
            console.error('Error in global delete callback:', error);
          }
        }
      });
      
      // Notify guild chat subscribers (all guilds)
      Object.values(this.subscribers.guild).forEach(guildSubs => {
        guildSubs.forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(deleteEvent);
            } catch (error) {
              console.error('Error in guild delete callback:', error);
            }
          }
        });
      });
      
      // Notify duel chat subscribers (all duels)
      Object.values(this.subscribers.duel).forEach(duelSubs => {
        duelSubs.forEach(sub => {
          if (sub.callback) {
            try {
              sub.callback(deleteEvent);
            } catch (error) {
              console.error('Error in duel delete callback:', error);
            }
          }
        });
      });
    }
  }
}

export default new ChatWebSocketService();