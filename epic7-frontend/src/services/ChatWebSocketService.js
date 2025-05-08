// Utilitaire WebSocket pour le chat
import { fetchUserProfile } from './userService';
import API from "../api/axiosInstance.jsx";

/**
 * Service to handle WebSocket connections for chat functionality
 */
class ChatWebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.handlers = {};
    this.handlerIdCounter = 0;
    this.roomId = null;
    this.pendingMessages = []; // Store messages that failed to send due to connection issues
  }

  /**
   * Initialize the WebSocket service
   */
  init(userId) {
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found for WebSocket connection');
      return false;
    }
    if (!this.roomId || !userId) {
      console.error('Room ID and user ID are required for WebSocket connection');
      return false;
    }
    try {
      // Determine WebSocket URL - using secure WebSocket if on HTTPS
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_API_URL || window.location.host;
      // Use backend-expected URL: /ws/chat/{roomId}?userId=...&token=...
      const wsUrl = `${wsProtocol}//${host}/ws/chat/${this.roomId}?userId=${userId}&token=${token}`;
      console.log('Initializing WebSocket connection to:', wsUrl.replace(/token=.*/, 'token=HIDDEN'));
      this.socket = new WebSocket(wsUrl);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      return true;
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      return false;
    }
  }

  /**
   * Connect to a specific chat room
   * @param {string|number} roomId - The ID of the chat room to connect to
   */
  async connect(roomId) {
    if (!roomId) {
      console.error('Room ID is required to connect');
      return false;
    }
    this.roomId = roomId;
    // Get userId from localStorage (set by chat components)
    let userId = null;
    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      userId = userData?.id;
    } catch (e) {}
    if (!userId) {
      console.error('User ID not found in localStorage for WebSocket connection');
      return false;
    }
    // If already connected to the correct room, do nothing
    if (this.isConnected()) {
      return true;
    }
    // Otherwise initialize connection
    return this.init(userId);
  }

  // Remove joinRoom and leaveRoom methods (handled by connection itself)

  /**
   * Send a message to the current room
   * @param {string} content - The message content
   * @param {string|number} roomId - The room ID (defaults to current room)
   */
  sendMessage(content, roomId = this.roomId) {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected. Adding to pending queue.');
      // Store message to send when connection is restored
      this.pendingMessages.push({ content, roomId });
      this.reconnect();
      return false;
    }

    if (!roomId) {
      console.error('Cannot send message: No room ID specified');
      return false;
    }

    // Use backend-expected type
    const chatMessage = {
      type: 'CHAT_MESSAGE',
      roomId: roomId,
      content: content,
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(chatMessage));
      console.log(`Message sent to room ${roomId}`);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      // Store message to send when connection is restored
      this.pendingMessages.push({ content, roomId });
      return false;
    }
  }

  /**
   * Add a message handler
   * @param {string} event - The event type to handle
   * @param {function} callback - The callback function to execute when the event occurs
   * @returns {number} - A unique handler ID that can be used to remove the handler
   */
  addHandler(event, callback) {
    if (!event || typeof callback !== 'function') {
      return -1;
    }

    const handlerId = ++this.handlerIdCounter;
    
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    
    this.handlers[event].push({
      id: handlerId,
      callback: callback
    });
    
    return handlerId;
  }

  /**
   * Remove a specific message handler
   * @param {number} handlerId - The ID of the handler to remove
   */
  removeHandler(handlerId) {
    if (!handlerId || handlerId < 0) {
      return false;
    }

    // Find and remove the handler from all event types
    Object.keys(this.handlers).forEach(event => {
      this.handlers[event] = this.handlers[event].filter(handler => handler.id !== handlerId);
      
      // Clean up empty arrays
      if (this.handlers[event].length === 0) {
        delete this.handlers[event];
      }
    });
    
    return true;
  }

  /**
   * Check if the WebSocket is connected
   * @returns {boolean} - True if connected, false otherwise
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Handle WebSocket open event
   * @param {Event} event - The open event
   */
  handleOpen(event) {
    console.log('WebSocket connection established');
    this.connected = true;
    this.reconnectAttempts = 0;

    // If we have a room ID, join that room immediately
    if (this.roomId) {
      this.joinRoom(this.roomId);
    }

    // Notify any open handlers
    this.notifyHandlers('onOpen', event);
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - The message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message received:', data.type || 'Unknown type');
      
      // Handle backend-expected types
      if (data.type === 'CHAT_MESSAGE' && data.message) {
        this.notifyHandlers('onChatMessage', data.message);
      } else if (data.type === 'MESSAGE_SENT' && data.data) {
        // Treat MESSAGE_SENT as a new chat message from the current user
        this.notifyHandlers('onChatMessage', data.data);
      } else if (data.type === 'USER_JOINED') {
        this.notifyHandlers('onUserJoin', data);
      } else if (data.type === 'USER_LEFT') {
        this.notifyHandlers('onUserLeave', data);
      } else if (data.type === 'TYPING') {
        this.notifyHandlers('onTyping', data);
      } else if (data.type === 'ERROR') {
        this.notifyHandlers('onError', data);
      }
      
      // Also notify general message handlers
      this.notifyHandlers('onMessage', data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - The close event
   */
  handleClose(event) {
    this.connected = false;
    
    const reason = event.reason || 'No reason provided';
    const wasClean = event.wasClean ? 'clean' : 'unclean';
    console.log(`WebSocket connection closed (${wasClean}): Code ${event.code}, Reason: ${reason}`);
    
    // Notify any close handlers
    this.notifyHandlers('onClose', event);
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   * @param {Event} event - The error event
   */
  handleError(event) {
    console.error('WebSocket error:', event);
    
    // Notify any error handlers
    this.notifyHandlers('onError', event);
  }

  /**
   * Notify all handlers of a specific event
   * @param {string} eventType - The type of event
   * @param {any} data - The event data
   */
  notifyHandlers(eventType, data) {
    if (!this.handlers[eventType]) {
      return;
    }
    
    this.handlers[eventType].forEach(handler => {
      try {
        handler.callback(data);
      } catch (error) {
        console.error(`Error in ${eventType} handler:`, error);
      }
    });
  }

  /**
   * Attempt to reconnect to the WebSocket
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      return;
    }
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Exponential backoff for reconnect attempts
    const backoffTime = Math.min(1000 * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting to WebSocket...');
      this.init();
    }, backoffTime);
  }

  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.roomId = null;
    }
    
    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Trigger handlers for a specific event
   * @param {string} event - The event name
   * @param {*} data - The data to pass to handlers
   */
  triggerHandlers(event, data = null) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler.callback(data);
        } catch (error) {
          console.error(`Error in WebSocket ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  reconnect() {
    // Don't attempt to reconnect if already reconnecting
    if (this.reconnectTimeout) {
      return;
    }
    
    // Check if max reconnect attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      this.triggerHandlers('onReconnectFailed');
      return;
    }
    
    // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Set timeout for reconnection
    this.reconnectTimeout = setTimeout(() => {
      console.log('Reconnecting to WebSocket...');
      this.reconnectTimeout = null;
      this.init();
    }, delay);
  }

  /**
   * Clear reconnect timeout
   */
  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Send any pending messages that failed due to connection issues
   */
  sendPendingMessages() {
    if (this.pendingMessages.length === 0) {
      return;
    }
    
    console.log(`Sending ${this.pendingMessages.length} pending messages`);
    
    // Create a copy of the pending messages and clear the original array
    const messagesToSend = [...this.pendingMessages];
    this.pendingMessages = [];
    
    // Send each message
    messagesToSend.forEach(msg => {
      this.sendMessage(msg.content, msg.roomId);
    });
  }
}

// Create and export a singleton instance
const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;