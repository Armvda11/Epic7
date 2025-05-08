import API from "../api/axiosInstance.jsx";

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
    const response = await API.get(`/chat/rooms/by-type?type=GUILD&groupId=${guildId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching guild chat room for guild ${guildId}:`, error);
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
export const sendChatMessage = async (chatRoomId, content) => {
  try {
    // Using query parameters as expected by the backend
    const response = await API.post(`/chat/send?roomId=${chatRoomId}&content=${encodeURIComponent(content)}`);
    return response.data;
  } catch (error) {
    console.error(`Error sending message to chat room ${chatRoomId}:`, error);
    throw error;
  }
};

// Delete a message
export const deleteChatMessage = async (messageId) => {
  try {
    const response = await API.delete(`/chat/messages/${messageId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting message ${messageId}:`, error);
    throw error;
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