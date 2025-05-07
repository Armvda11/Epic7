import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchChatMessages, sendChatMessage, deleteChatMessage, connectToChat, isUserChatAdmin } from '../services/ChatServices';
import { fetchUserProfile } from '../services/userService';

// Create the Chat Context
const ChatContext = createContext();

// Chat Provider Component
export const ChatProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Load current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await fetchUserProfile();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setError('Failed to load user profile');
      }
    };
    
    loadCurrentUser();
  }, []);
  
  // Switch to a different chat room
  const switchRoom = useCallback(async (room) => {
    try {
      setLoading(true);
      setError(null);
      
      // Connect to the new room
      await connectToChat(room.id);
      
      // Check if user is admin
      const adminStatus = await isUserChatAdmin(room.id);
      setIsAdmin(adminStatus);
      
      // Load messages for the room
      const chatMessages = await fetchChatMessages(room.id);
      
      // Ensure chatMessages is an array before setting it
      if (Array.isArray(chatMessages)) {
        setMessages(chatMessages);
      } else {
        console.error('Messages data is not an array:', chatMessages);
        setMessages([]); // Set empty array to prevent map errors
      }
      
      // Set the current room
      setCurrentRoom(room);
    } catch (err) {
      console.error('Error switching chat room:', err);
      setError('Failed to load chat room');
      setMessages([]); // Set empty array to prevent map errors
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Refresh messages in the current room
  const refreshMessages = useCallback(async () => {
    if (!currentRoom) return;
    
    try {
      setLoading(true);
      const chatMessages = await fetchChatMessages(currentRoom.id);
      
      // Ensure chatMessages is an array before setting it
      if (Array.isArray(chatMessages)) {
        setMessages(chatMessages);
      } else {
        console.error('Messages data is not an array:', chatMessages);
        setMessages([]); // Set empty array to prevent map errors
      }
    } catch (err) {
      console.error('Error refreshing messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentRoom]);
  
  // Send a message to the current room
  const sendMessage = useCallback(async (content) => {
    if (!currentRoom || !content.trim()) return null;
    
    try {
      const sentMessage = await sendChatMessage(currentRoom.id, content);
      
      // Update the messages list with the new message
      setMessages(prevMessages => {
        // Ensure prevMessages is an array
        const messagesArray = Array.isArray(prevMessages) ? prevMessages : [];
        return [...messagesArray, sentMessage];
      });
      
      return sentMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return null;
    }
  }, [currentRoom]);
  
  // Delete a message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await deleteChatMessage(messageId);
      
      // Remove the deleted message from the messages list
      setMessages(prevMessages => {
        // Ensure prevMessages is an array
        if (!Array.isArray(prevMessages)) return [];
        return prevMessages.filter(msg => msg.id !== messageId);
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
      return false;
    }
  }, []);
  
  // Value to be provided to consumers
  const value = {
    loading,
    error,
    messages,
    currentRoom,
    currentUser,
    isAdmin,
    typingUsers,
    switchRoom,
    refreshMessages,
    sendMessage,
    deleteMessage,
    setTypingUsers,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Custom hook to use the Chat Context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;