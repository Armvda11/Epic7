import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  fetchGlobalChatRoom,
  fetchGuildChatRoom,
  fetchChatMessages,
  sendChatMessage,
  deleteChatMessage
} from "../services/ChatServices";
import ChatWebSocketService from "../services/ChatWebSocketService";
import { getToken, isAuthenticated } from "../services/authService";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [globalChatRoom, setGlobalChatRoom] = useState(null);
  const [guildChatRooms, setGuildChatRooms] = useState({});
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webSocketStatus, setWebSocketStatus] = useState('disconnected');
  const [typingUsers, setTypingUsers] = useState([]); // Users currently typing
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(isAuthenticated());
  
  // Store subscriptions for cleanup
  const subscriptionsRef = useRef({
    message: null,
    typing: null,
    delete: null
  });

  // Check authentication status on mount and set up listener
  useEffect(() => {
    // Set initial auth state
    setIsUserAuthenticated(isAuthenticated());
    
    // Listen for storage events (for logout/login in other tabs)
    const handleStorageChange = () => {
      const newAuthState = isAuthenticated();
      setIsUserAuthenticated(newAuthState);
      
      // If user logged out, disconnect
      if (!newAuthState && ChatWebSocketService.isConnected()) {
        ChatWebSocketService.disconnect();
        setWebSocketStatus('disconnected');
      }
      // If user logged in and we're disconnected, we'll let the other useEffect handle connection
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) {
      setError("Invalid chat room ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const msgs = await fetchChatMessages(roomId);
      setMessages(msgs);
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch and set global chat room
  const fetchGlobalRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const room = await fetchGlobalChatRoom();
      if (room && room.id) {
        setGlobalChatRoom(room);
        setCurrentRoom(room);
        fetchMessages(room.id);
      } else {
        setError("Global chat room not found.");
      }
    } catch (err) {
      setError("Failed to load global chat room");
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  // Fetch and set guild chat room by guildId
  const fetchChatRoomByGuildId = useCallback(async (guildId) => {
    setLoading(true);
    setError(null);
    try {
      const room = await fetchGuildChatRoom(guildId);
      setGuildChatRooms(prev => ({ ...prev, [guildId]: room }));
      setCurrentRoom(room);
      fetchMessages(room.id);
      return room;
    } catch (err) {
      setError("Failed to load guild chat room");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  // Switch to a different room
  const switchRoom = useCallback((room) => {
    // Clear typing users when switching rooms
    setTypingUsers([]);
    
    // Unsubscribe from current room's events
    if (subscriptionsRef.current.message) {
      subscriptionsRef.current.message.unsubscribe();
    }
    if (subscriptionsRef.current.typing) {
      subscriptionsRef.current.typing.unsubscribe();
    }
    if (subscriptionsRef.current.delete) {
      subscriptionsRef.current.delete.unsubscribe();
    }
    
    setCurrentRoom(room);
    if (room && room.id) {
      fetchMessages(room.id);
      
      // Subscribe to the new room based on room type
      if (room.type === 'GLOBAL') {
        subscriptionsRef.current.message = ChatWebSocketService.subscribeToGlobalChat(handleMessage);
      } else if (room.type === 'GUILD') {
        subscriptionsRef.current.message = ChatWebSocketService.subscribeToGuildChat(room.groupId, handleMessage);
      } else if (room.type === 'FIGHT') {
        subscriptionsRef.current.message = ChatWebSocketService.subscribeToDuelChat(room.groupId, handleMessage);
      }
    }
  }, [fetchMessages]);

  // Handle incoming messages and events
  const handleMessage = useCallback((data) => {
    // Handle typing events
    if (data.type === 'typing') {
      setTypingUsers(prev => {
        if (data.typing) {
          // Add user to typing list if not already there
          if (!prev.includes(data.user)) {
            return [...prev, data.user];
          }
        } else {
          // Remove user from typing list
          return prev.filter(user => user !== data.user);
        }
        return prev;
      });
      return;
    }
    
    // Handle delete events
    if (data.type === 'delete') {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      return;
    }
    
    // Handle regular messages
    setMessages(prev => {
      // Check for duplicates
      if (prev.some(m => m.id === data.id)) return prev;
      
      // Add the new message
      return [...prev, data];
    });
  }, []);

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!currentRoom || !content.trim()) return null;
    
    try {
      // Try to send via REST API first (this guarantees persistence)
      const response = await sendChatMessage(currentRoom.id, content);
      
      // IMPORTANT: Don't send via WebSocket if it's already done in the API
      // The backend already broadcasts the message to all clients including this one
      // The message will come back via the WebSocket subscription
      
      // Return the response from the REST API
      return response;
    } catch (err) {
      console.error('Error sending message:', err);
      setError("Failed to send message");
      throw err; // Re-throw to let the component handle it
    }
  }, [currentRoom]);

  // Delete a message
  const deleteMessageById = useCallback(async (messageId) => {
    try {
      // Send delete request via WebSocket
      if (ChatWebSocketService.isConnected() && currentRoom) {
        await ChatWebSocketService.deleteMessage({
          messageId,
          roomId: currentRoom.id
        });
        return true;
      } else {
        // Fallback to API
        await deleteChatMessage(messageId);
        
        // Update local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        return true;
      }
    } catch (err) {
      setError("Failed to delete message");
      return false;
    }
  }, [currentRoom]);

  // Send typing status
  const sendTypingStatus = useCallback((isTyping) => {
    if (!currentRoom) return;
    
    if (ChatWebSocketService.isConnected()) {
      ChatWebSocketService.sendTypingStatus(currentRoom.id, isTyping);
    }
  }, [currentRoom]);

  // Connect to WebSocket only when authenticated and in a non-login page
  useEffect(() => {
    // Only attempt to connect if authenticated
    if (!isUserAuthenticated) {
      // Make sure we're disconnected if not authenticated
      if (ChatWebSocketService.isConnected()) {
        ChatWebSocketService.disconnect();
        setWebSocketStatus('disconnected');
      }
      return;
    }
    
    // Now we know user is authenticated, connect if disconnected
    if (webSocketStatus === 'disconnected') {
      setWebSocketStatus('connecting');
      
      const connectToWebSocket = async () => {
        try {
          await ChatWebSocketService.connect();
          setWebSocketStatus('connected');
          console.log('WebSocket connection established successfully');
        } catch (error) {
          // Avoid showing too many connection attempt errors
          if (!error.message.includes('Connection attempt already in progress')) {
            console.error('Failed to connect to chat service:', error);
          }
          
          // Still set status to connected if we're in fallback mode
          // This ensures the UI doesn't keep trying to reconnect
          if (error.message.includes('Connection attempt timed out')) {
            console.warn('Operating in fallback mode with REST API');
            // Don't set to disconnected, just leave in "connecting" state
            // which will prevent further connection attempts
          } else {
            setWebSocketStatus('disconnected');
          }
        }
      };
      
      connectToWebSocket();
    }
    
    // Setup event listeners for connection status changes
    const handleOpen = () => setWebSocketStatus('connected');
    const handleClose = () => setWebSocketStatus('disconnected');
    const handleError = () => {
      // Don't set to disconnected immediately, let the connect timeout handle it
      console.warn('WebSocket error event received');
    };
    
    window.addEventListener('ws:open', handleOpen);
    window.addEventListener('ws:close', handleClose);
    window.addEventListener('ws:error', handleError);
    
    // Cleanup on unmount or auth change
    return () => {
      // Remove event listeners
      window.removeEventListener('ws:open', handleOpen);
      window.removeEventListener('ws:close', handleClose);
      window.removeEventListener('ws:error', handleError);
      
      // Unsubscribe from all subscriptions
      if (subscriptionsRef.current.message) {
        subscriptionsRef.current.message.unsubscribe();
      }
      if (subscriptionsRef.current.typing) {
        subscriptionsRef.current.typing.unsubscribe();
      }
      if (subscriptionsRef.current.delete) {
        subscriptionsRef.current.delete.unsubscribe();
      }
      
      // Do not disconnect WebSocket on component unmount
      // as it should persist across the application
      // Only disconnect on logout which is handled elsewhere
    };
  }, [webSocketStatus, isUserAuthenticated]);

  const value = {
    globalChatRoom,
    guildChatRooms,
    currentRoom,
    messages,
    loading,
    error,
    webSocketStatus,
    typingUsers,
    fetchGlobalChatRoom: fetchGlobalRoom,
    fetchChatRoomByGuildId,
    switchRoom,
    sendMessage,
    deleteMessage: deleteMessageById,
    sendTypingStatus
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);