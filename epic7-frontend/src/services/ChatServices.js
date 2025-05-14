import ChatWebSocketService from "./ChatWebSocketService";

// Fetch global chat room (create if it doesn't exist)
export const fetchGlobalChatRoom = async () => {
  try {
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for global chat');
      await ChatWebSocketService.connect();
    }
    
    console.log('[ChatServices] Fetching global chat room via WebSocket');
    return await ChatWebSocketService.fetchChatRoom('GLOBAL');
  } catch (error) {
    console.error('Error fetching global chat room:', error);
    throw error;
  }
};

// Fetch guild chat room by guild ID
export const fetchGuildChatRoom = async (guildId) => {
  try {
    console.log(`Fetching guild chat room for guild ID: ${guildId}`);
    
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for guild chat');
      await ChatWebSocketService.connect();
    }
    
    console.log('[ChatServices] Fetching guild chat room via WebSocket');
    return await ChatWebSocketService.fetchChatRoom('GUILD', guildId);
  } catch (error) {
    console.error(`Error fetching guild chat room for guild ${guildId}:`, error);
    throw error;
  }
};

// Create a guild chat room - using WebSocket to fetch/create
export const createGuildChatRoom = async (guildId) => {
  try {
    console.log(`Creating guild chat room for guild ID: ${guildId}`);
    
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for guild chat creation');
      await ChatWebSocketService.connect();
    }
    
    // Fetch the guild chat room via WebSocket - it will be created if it doesn't exist
    const roomData = await ChatWebSocketService.fetchChatRoom('GUILD', guildId);
    
    console.log(`Successfully fetched/created guild chat room:`, roomData);
    
    // Ensure the room has all required properties
    if (!roomData.id) {
      console.warn(`Created room is missing ID, adding fallback ID`);
      roomData.id = `guild-${guildId}`;
    }
    
    if (!roomData.type) {
      console.warn(`Created room is missing type, setting to GUILD`);
      roomData.type = 'GUILD';
    }
    
    return roomData;
  } catch (error) {
    console.error(`Error creating guild chat room for guild ${guildId}:`, error);
    
    // Fallback to local room object for UI purposes
    return {
      id: `guild-${guildId}`,
      name: `Guild ${guildId} Chat`,
      type: 'GUILD',
      groupId: guildId
    };
  }
};

// Get messages for a specific chat room
export const fetchChatMessages = async (chatRoomId, limit = 50) => {
  try {
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for fetching messages');
      await ChatWebSocketService.connect();
    }
    
    console.log(`[ChatServices] Fetching messages for chat room ${chatRoomId} via WebSocket`);
    return await ChatWebSocketService.fetchChatMessages(chatRoomId, limit);
  } catch (error) {
    console.error(`Error fetching messages for chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Send a message to a chat room
export const sendChatMessage = async (chatRoomId, content, chatType = "GLOBAL", transactionId = null) => {
  try {
    console.log(`[ChatServices] Sending message to room ${chatRoomId}, type: ${chatType}`);
    console.log(`[ChatServices] Message content: "${content}"`);
    
    // Generate a transaction ID if not provided
    const effectiveTransactionId = transactionId || `ws-send-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Track this transaction in WebSocketService to prevent duplicate processing
    ChatWebSocketService.markTransactionProcessed(effectiveTransactionId);
    
    // Extract guild ID if this is a guild chat and the chatRoomId contains it
    let guildId = null;
    if (chatType === 'GUILD' && chatRoomId) {
      const guildIdMatch = chatRoomId.toString().match(/guild-(\d+)/);
      if (guildIdMatch && guildIdMatch[1]) {
        guildId = guildIdMatch[1];
        console.log(`[ChatServices] Extracted guildId=${guildId} from roomId`);
      }
    }
    
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for sending message');
      await ChatWebSocketService.connect();
    }
    
    // Prepare message data
    const messageData = {
      roomId: chatRoomId,
      content: content,
      transactionId: effectiveTransactionId
    };
    
    if (chatType) {
      messageData.chatType = chatType;
    }
    
    if (chatType === 'GUILD' && guildId) {
      messageData.guildId = guildId;
    }
    
    // Send via WebSocket 
    await ChatWebSocketService.sendMessage(messageData);
    
    // The actual message data will come back via WebSocket broadcast
    return {
      id: `temp-${effectiveTransactionId}`,
      roomId: chatRoomId,
      content: content,
      chatType: chatType,
      transactionId: effectiveTransactionId,
      temporary: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error sending message to chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Delete a message
export const deleteMessage = async (messageId, roomId, uniqueId) => {
  try {
    if (!messageId || !roomId) {
      return false;
    }

    const normalizedMessageId = messageId.toString();
    const transactionId = `ws-delete-${normalizedMessageId}-${Date.now()}`;
    
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log('[ChatServices] Connecting to WebSocket for message deletion');
      await ChatWebSocketService.connect();
    }
    
    // Determine chat type based on roomId or other information if available
    let chatType = "GLOBAL";
    if (roomId.toString().includes("guild")) {
      chatType = "GUILD";
    } else if (roomId.toString().includes("duel") || roomId.toString().includes("fight")) {
      chatType = "FIGHT";
    }
    
    console.log(`[ChatServices] Deleting message ${messageId} from room ${roomId} via WebSocket`);
    
    // Delete via WebSocket
    await ChatWebSocketService.deleteMessage({
      messageId: normalizedMessageId,
      roomId,
      uniqueId,
      transactionId,
      chatType: chatType
    });
    
    // Notify local handlers for immediate UI feedback
    ChatWebSocketService.notifyHandlers('onMessageDeleted', {
      type: 'delete',
      messageId: normalizedMessageId,
      id: normalizedMessageId,
      roomId,
      uniqueId,
      transactionId,
      chatType: chatType
    });
    
    return true;
  } catch (error) {
    console.error(`Error deleting message ${messageId} from room ${roomId}:`, error);
    return false;
  }
};

// Connect user to a chat room - WebSocket connection is implicitly handled by the WebSocketService
export const connectToChat = async (chatRoomId) => {
  try {
    // Ensure WebSocket is connected
    if (!ChatWebSocketService.isConnected()) {
      console.log(`[ChatServices] Connecting to WebSocket for room ${chatRoomId}`);
      await ChatWebSocketService.connect();
    }
    
    // Subscribe to the chat room
    const subscription = ChatWebSocketService.subscribeToRoom(chatRoomId);
    
    return {
      success: true,
      data: {
        roomId: chatRoomId,
        connected: true,
        subscription: subscription
      }
    };
  } catch (error) {
    console.error(`Error connecting to chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Disconnect user from a chat room - handled by the WebSocketService
export const disconnectFromChat = async (chatRoomId) => {
  try {
    // Unsubscribe from the chat room
    ChatWebSocketService.unsubscribeFromRoom(chatRoomId);
    
    return {
      success: true,
      data: {
        roomId: chatRoomId,
        connected: false
      }
    };
  } catch (error) {
    console.error(`Error disconnecting from chat room ${chatRoomId}:`, error);
    throw error;
  }
};

