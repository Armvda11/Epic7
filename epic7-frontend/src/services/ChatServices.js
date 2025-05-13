import API from "../api/axiosInstance.jsx";
import ChatWebSocketService from "./ChatWebSocketService";

// Fetch available chat rooms
export const fetchChatRooms = async () => {
  try {
    const response = await API.get('/chat/rooms');
    return response.data;
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    throw error;
  }
};

// Fetch global chat room (create if it doesn't exist)
export const fetchGlobalChatRoom = async () => {
  try {
    const response = await API.get('/chat/rooms/global');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching global chat room:', error);
    throw error;
  }
};

// Fetch guild chat room by guild ID
export const fetchGuildChatRoom = async (guildId) => {
  try {
    console.log(`Fetching guild chat room for guild ID: ${guildId}`);
    const response = await API.get(`/chat/rooms/guild/${guildId}`);
    
    console.log(`Guild chat room API response:`, response.data);
    
    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      console.log(`No chat room found for guild ${guildId}, creating one`);
      // Room doesn't exist, create it
      return await createGuildChatRoom(guildId);
    }
  } catch (error) {
    console.error(`Error fetching guild chat room for guild ${guildId}:`, error);
    
    if (error.response) {
      console.log(`Server response:`, error.response.data);
      console.log(`Status code:`, error.response.status);
    }
    
    if (error.response && error.response.status === 404) {
      console.log(`Chat room not found for guild ${guildId}, creating one`);
      // Room doesn't exist, create it
      return await createGuildChatRoom(guildId);
    }
    
    throw error;
  }
};

// Create a guild chat room
export const createGuildChatRoom = async (guildId) => {
  try {
    console.log(`Creating guild chat room for guild ID: ${guildId}`);
    // Use the general chat room creation endpoint with guild-specific data
    const response = await API.post('/chat/rooms', {
      name: `Guild ${guildId} Chat`,
      type: 'GUILD',
      guildId: guildId
    });
    
    console.log(`Chat room creation response:`, response.data);
    
    if (response.data && response.data.data) {
      const roomData = response.data.data;
      console.log(`Successfully created guild chat room:`, roomData);
      
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
    } else if (response.data && response.data.success) {
      // Some APIs may not nest the data under a data property
      console.log(`Guild chat room created successfully:`, response.data);
      
      // Create a properly structured room object
      const roomData = {
        id: response.data.id || `guild-${guildId}`,
        name: response.data.name || `Guild ${guildId} Chat`,
        type: 'GUILD',
        groupId: guildId
      };
      
      return roomData;
    } else {
      console.warn(`Created guild chat room but received unexpected response:`, response.data);
      // Fallback to local room object
      return {
        id: `guild-${guildId}`,
        name: `Guild ${guildId} Chat`,
        type: 'GUILD',
        groupId: guildId
      };
    }
  } catch (error) {
    console.error(`Error creating guild chat room for guild ${guildId}:`, error);
    if (error.response) {
      console.log(`Server response:`, error.response.data);
      console.log(`Status code:`, error.response.status);
    }
    
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
    const response = await API.get(`/chat/rooms/${chatRoomId}/messages?limit=${limit}`);
    return response.data.data;
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
    const effectiveTransactionId = transactionId || `rest-send-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
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
    
    let url = `/chat/send?roomId=${chatRoomId}&content=${encodeURIComponent(content)}`;
    if (chatType) {
      url += `&chatType=${chatType}`;
    }
    
    if (chatType === 'GUILD' && guildId) {
      url += `&guildId=${guildId}`;
    }
    
    // Add transaction ID to help with deduplication
    url += `&transactionId=${effectiveTransactionId}`;
    
    console.log(`[ChatServices] API URL for message: ${url}`);
    const response = await API.post(url);
    
    console.log(`[ChatServices] Message send response:`, response.data);
    const messageData = response.data.data;
    
    if (messageData) {
      // Add additional context to messageData
      messageData.chatType = chatType;
      messageData.transactionId = effectiveTransactionId;
      
      if (chatType === 'GUILD' && guildId) {
        messageData.guildId = guildId;
      }
    }
    
    // We've already made the REST API call, so we don't need to also send via WebSocket
    // or manually notify handlers. The server will broadcast the message to all subscribers
    // including this client, through the WebSocket subscription.
    
    return response.data.data;
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
    const transactionId = `rest-delete-${normalizedMessageId}-${Date.now()}`;

    let url = `/chat/messages/${normalizedMessageId}?roomId=${roomId}`;
    if (uniqueId) {
      url += `&uniqueId=${encodeURIComponent(uniqueId)}`;
    }
    
    const response = await API.delete(url);
    
    // Determine chat type
    let chatType = "GLOBAL";
    if (url.includes("guild")) {
      chatType = "GUILD";
    } else if (url.includes("duel") || url.includes("fight")) {
      chatType = "FIGHT";
    }

    // Notify WebSocket handlers
    ChatWebSocketService.notifyHandlers('onMessageDeleted', {
      type: 'delete',
      messageId: normalizedMessageId,
      id: normalizedMessageId,
      roomId,
      uniqueId,
      transactionId,
      chatType: chatType
    });
    
    // Also try direct WebSocket deletion
    try {
      ChatWebSocketService.deleteMessage({
        messageId: normalizedMessageId,
        roomId,
        uniqueId,
        transactionId,
        chatType: chatType
      });
    } catch (wsError) {
      // Continue since the REST API call was successful
    }
    
    return response.data.success !== false;
  } catch (error) {
    console.error(`Error deleting message ${messageId} from room ${roomId}:`, error);
    return false;
  }
};

// Connect user to a chat room
export const connectToChat = async (chatRoomId) => {
  try {
    const response = await API.post(`/chat/rooms/${chatRoomId}/connect`);
    return response.data;
  } catch (error) {
    console.error(`Error connecting to chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Disconnect user from a chat room
export const disconnectFromChat = async (chatRoomId) => {
  try {
    const response = await API.post(`/chat/rooms/${chatRoomId}/disconnect`);
    return response.data;
  } catch (error) {
    console.error(`Error disconnecting from chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Check if a user is an admin of a chat room
export const isUserChatAdmin = async (chatRoomId) => {
  try {
    const response = await API.get(`/chat/rooms/${chatRoomId}/isAdmin`);
    if (response.data && response.data.data) {
      return response.data.data.isAdmin;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Mark messages as read up to a specific message ID
export const markMessagesAsRead = async (roomId, lastReadMessageId) => {
  try {
    const response = await API.post(`/chat/messages/${roomId}/read?lastReadMessageId=${lastReadMessageId}`);
    return response.data;
  } catch (error) {
    console.error(`Error marking messages as read in room ${roomId}:`, error);
    throw error;
  }
};