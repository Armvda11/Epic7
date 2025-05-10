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
    return response.data.data; // Return only the room data
  } catch (error) {
    console.error('Error fetching global chat room:', error);
    throw error;
  }
};

// Fetch guild chat room by guild ID
export const fetchGuildChatRoom = async (guildId) => {
  try {
    console.log(`Fetching guild chat room for guild ID: ${guildId}`);
    // Use the dedicated guild chat endpoint instead of the generic by-type endpoint
    const response = await API.get(`/chat/rooms/guild/${guildId}`);
    
    // Check if we received a valid response with data
    if (response.data && response.data.data) {
      console.log(`Received guild chat room data for guild ${guildId}:`, response.data.data);
      return response.data.data; // Return only the room data
    } else {
      console.warn(`Received empty or invalid response for guild ${guildId} chat room:`, response.data);
      // Return a default chat room object to prevent UI errors
      return {
        id: `guild-${guildId}`,
        name: `Guild ${guildId} Chat`,
        type: 'GUILD',
        groupId: guildId
      };
    }
  } catch (error) {
    console.error(`Error fetching guild chat room for guild ${guildId}:`, error);
    
    // If it's a 404, the guild might not exist yet, so we'll create a default room
    if (error.response && error.response.status === 404) {
      console.log(`Guild ${guildId} not found, returning default chat room`);
      return {
        id: `guild-${guildId}`,
        name: `Guild ${guildId} Chat`,
        type: 'GUILD',
        groupId: guildId
      };
    }
    
    throw error;
  }
};

// Get messages for a specific chat room
export const fetchChatMessages = async (chatRoomId, limit = 50) => {
  try {
    const response = await API.get(`/chat/rooms/${chatRoomId}/messages?limit=${limit}`);
    // The backend wraps the messages in response.data.data
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching messages for chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Send a message to a chat room
export const sendChatMessage = async (chatRoomId, content, chatType = "GLOBAL") => {
  try {
    // Using query parameters as expected by the backend
    let url = `/chat/send?roomId=${chatRoomId}&content=${encodeURIComponent(content)}`;
    // Add chatType as a parameter if provided
    if (chatType) {
      url += `&chatType=${chatType}`;
    }
    
    const response = await API.post(url);
    
    // After successfully sending via API, if we don't get a WebSocket notification
    // from the server within 100ms, manually trigger the WebSocket handler
    // to ensure all clients show the message
    const messageData = response.data.data;
    
    // Add chatType to message data so it propagates correctly
    if (messageData && chatType) {
      messageData.chatType = chatType;
    }
    
    // Set a short delay to check if WebSocket has already broadcasted this message
    // If not, we'll manually trigger the handlers
    setTimeout(() => {
      if (messageData && messageData.id) {
        const messageId = messageData.id.toString();
        // Check if this message has been processed by WebSocket already
        // Get the message from the response and notify WebSocket handlers
        console.log('Manually triggering message handlers for message:', messageId);
        ChatWebSocketService.notifyHandlers('onChatMessage', messageData);
      }
    }, 100);
    
    return response.data.data;
  } catch (error) {
    console.error(`Error sending message to chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Delete a message
export const deleteMessage = async (messageId, roomId, uniqueId) => {
  try {
    // Make sure we have both required parameters
    if (!messageId || !roomId) {
      console.error('[ChatService] Cannot delete message: Missing messageId or roomId');
      return false;
    }

    // Normalize messageId to string for consistent handling
    const normalizedMessageId = messageId.toString();

    console.log(`[ChatService] Deleting message ${normalizedMessageId}${uniqueId ? `, uniqueId ${uniqueId}` : ' (no uniqueId)'} from room ${roomId}`);

    // Generate a transaction ID to track this deletion
    const transactionId = `rest-delete-${normalizedMessageId}-${Date.now()}`;

    // Send delete request to the server with both messageId and roomId
    // Use a more structured URL that can include uniqueId if it exists
    let url = `/chat/messages/${normalizedMessageId}?roomId=${roomId}`;
    if (uniqueId) {
      url += `&uniqueId=${encodeURIComponent(uniqueId)}`;
      console.log(`[ChatService] Added uniqueId to delete request: ${url}`);
    } else {
      console.warn('[ChatService] No uniqueId provided for delete request. This may cause precision issues.');
    }
    
    // Execute the delete request
    console.log(`[ChatService] Sending DELETE request to: ${url}`);
    const response = await API.delete(url);
    
    // Immediately notify WebSocket handlers to ensure all clients remove the message
    // This helps when the WebSocket broadcast from the server might be delayed or missed
    console.log(`[ChatService] Immediately triggering deletion handlers for message id: ${normalizedMessageId}, uniqueId: ${uniqueId || 'not provided'}`);
    ChatWebSocketService.notifyHandlers('onMessageDeleted', {
      type: 'delete', // Explicitly set type for consistent processing
      messageId: normalizedMessageId,
      id: normalizedMessageId, // Also include as id for redundancy
      roomId,
      uniqueId, // Pass the uniqueId if available
      transactionId // Include transaction ID to prevent duplicates
    });
    
    // Also try direct WebSocket deletion as a backup
    try {
      ChatWebSocketService.deleteMessage({
        messageId: normalizedMessageId,
        roomId,
        uniqueId,
        transactionId 
      });
    } catch (wsError) {
      console.warn('[ChatService] WebSocket direct deletion failed, but REST API succeeded:', wsError);
      // Continue since the REST API call was successful
    }
    
    return response.data.success !== false;
  } catch (error) {
    console.error(`[ChatService] Error deleting message ${messageId} from room ${roomId}:`, error);
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
    console.error(`Error checking admin status for chat room ${chatRoomId}:`, error);
    return false; // Default to false if there's an error
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