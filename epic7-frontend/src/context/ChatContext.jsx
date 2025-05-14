import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import chatService from '../services/ChatServices';
import { getUserId, getUserEmail } from '../services/authService';

// Create the context
const ChatContext = createContext();

// Custom hook to use the chat context
export const useChatContext = () => {
const context = useContext(ChatContext);
if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
}
return context;
};

// Error handler component for chat errors
const ChatErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // Listen for unhandled errors in the chat context
    const handleError = (error) => {
      console.error('Chat error caught by boundary:', error);
      setHasError(true);
    };
    
    window.addEventListener('chatError', handleError);
    return () => window.removeEventListener('chatError', handleError);
  }, []);
  
  if (hasError) {
    return fallback || <p>Une erreur s'est produite dans le chat. Veuillez actualiser la page.</p>;
  }
  
  return children;
}

// Provider component
export const ChatProvider = ({ children }) => {
const [initialized, setInitialized] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [currentRoom, setCurrentRoom] = useState(null);
const [messages, setMessages] = useState([]);
const [typingUsers, setTypingUsers] = useState([]);
const [user, setUser] = useState(null);

// Initialize chat service
useEffect(() => {
    const initializeChat = async () => {
      try {
        // Since ChatProvider is now only rendered for authenticated routes,
        // we can assume the user is logged in
        const userId = getUserId();
        const userEmail = getUserEmail();
        
        setLoading(true);
        setError(null);
        
        const currentUser = {
          id: userId,
          email: userEmail
        };
        
        setUser(currentUser);
        
        // Register callbacks for chat events
        chatService.on('onConnected', handleConnected);
        chatService.on('onError', handleError);
        chatService.on('onMessageReceived', handleMessageReceived);
        chatService.on('onTyping', handleTypingStatus);
        
        // Initialize chat service
        await chatService.initialize(currentUser);
        
        setInitialized(true);
      } catch (err) {
        console.error('Erreur d\'initialisation du chat:', err);
        setError('Impossible d\'initialiser le chat');
      } finally {
        setLoading(false);
      }
    };

    if (!initialized && !loading) {
      initializeChat();
    }

    // Cleanup when component unmounts
    return () => {
      if (initialized) {
        chatService.off('onConnected');
        chatService.off('onError');
        chatService.off('onMessageReceived');
        chatService.off('onTyping');
        chatService.disconnect();
        setInitialized(false);
      }
    };
}, [initialized, loading]);

// Callback handlers for chat events
const handleConnected = useCallback(() => {
    console.log('Connected to chat service');
}, []);

const handleError = useCallback((error) => {
    console.error('Chat error:', error);
    setError(error.message || 'Une erreur est survenue avec le service de chat');
}, []);

const handleMessageReceived = useCallback((message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
}, []);

const handleTypingStatus = useCallback((user, isTyping) => {
    setTypingUsers((prev) => {
    if (isTyping) {
        return [...prev.filter(u => u !== user), user];
    } else {
        return prev.filter(u => u !== user);
    }
    });
}, []);

// Join a chat room (global or guild)
const joinRoom = useCallback(async (type, guildId = null) => {
    try {
    setLoading(true);
    setError(null);
    
    let roomId;
    if (type === 'global') {
        roomId = await chatService.joinGlobalChat();
    } else if (type === 'guild' && guildId) {
        roomId = await chatService.joinGuildChat(guildId);
    } else {
        throw new Error('Type de salon invalide ou identifiant de guilde manquant');
    }
    
    // Get messages for this room
    const roomMessages = chatService.getMessages(roomId);
    setMessages(roomMessages);
    setCurrentRoom(roomId);
    setLoading(false);
    
    return roomId;
    } catch (err) {
    console.error('Erreur en rejoignant le salon:', err);
    setError('Impossible de rejoindre le salon de chat');
    setLoading(false);
    throw err;
    }
}, []);

// Leave current room
const leaveRoom = useCallback(() => {
    if (currentRoom) {
    const roomType = currentRoom.includes('guild') ? 'GUILD' : 'GLOBAL';
    const groupId = roomType === 'GUILD' ? currentRoom.split('.')[1] : null;
    
    chatService.leaveChat(roomType, groupId);
    setCurrentRoom(null);
    setMessages([]);
    setTypingUsers([]);
    }
}, [currentRoom]);

// Send a message to the current room
const sendMessage = useCallback(async (content) => {
    try {
    if (!currentRoom) {
        throw new Error('Aucun salon de chat sélectionné');
    }
    
    await chatService.sendMessage(currentRoom, content);
    return true;
    } catch (err) {
    console.error('Erreur d\'envoi de message:', err);
    setError('Impossible d\'envoyer votre message');
    throw err;
    }
}, [currentRoom]);

// Delete a message
const deleteMessage = useCallback(async (messageId) => {
    try {
    if (!currentRoom) {
        throw new Error('Aucun salon de chat sélectionné');
    }
    
    await chatService.deleteMessage(messageId, currentRoom);
    
    // Update local state after successful deletion
    setMessages((prevMessages) => 
        prevMessages.filter(msg => msg.id !== messageId)
    );
    
    return true;
    } catch (err) {
    console.error('Erreur de suppression de message:', err);
    setError('Impossible de supprimer le message');
    throw err;
    }
}, [currentRoom]);

// Set typing status
const setTyping = useCallback((isTyping) => {
    if (currentRoom) {
    chatService.setTypingStatus(currentRoom, isTyping);
    }
}, [currentRoom]);

// Context value
const value = {
    initialized,
    loading,
    error,
    messages,
    typingUsers,
    currentRoom,
    user,
    joinRoom,
    leaveRoom,
    sendMessage,
    deleteMessage,
    setTyping
};

return (
    <ChatContext.Provider value={value}>
      <ChatErrorBoundary>
        {children}
      </ChatErrorBoundary>
    </ChatContext.Provider>
);
};