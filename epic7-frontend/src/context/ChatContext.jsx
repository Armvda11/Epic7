import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import chatService from '../services/chatServices/ChatServices';
import { getUserId, getUserEmail } from '../services/authService';
import API from '../api/axiosInstance';  // Import API for user data fetching
import { isOwnMessage, isCurrentUser } from '../utils/userUtils'; // Import user utility functions

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

// Helper functions for message ownership and styling
export const isUserMessage = (message, currentUser) => {
  if (!message || !message.sender || !currentUser) return false;

  // sender can be an object (with id or username) or a string (username)
  if (typeof message.sender === 'object') {
    const senderId = message.sender.id?.toString();
    const userId = currentUser.id?.toString();
    if (senderId && userId && senderId === userId) return true;
    if (
      message.sender.username &&
      currentUser.username &&
      message.sender.username === currentUser.username
    )
      return true;
  } else if (typeof message.sender === 'string') {
    // sender is username string
    if (
      currentUser.username &&
      message.sender === currentUser.username
    )
      return true;
    // fallback: if user email is used as username
    if (
      currentUser.email &&
      message.sender === currentUser.email
    )
      return true;
  } else {
    // Unexpected sender format
    console.warn('Unknown sender format in message:', message);
  }
  // fallback for temporary messages
  return message.temporary === true;
};

export const getMessageStyle = (message, currentUser) => {
  const isCurrentUserMessage = isUserMessage(message, currentUser);
  
  // Use a more distinct purple for better visibility
  return {
    alignSelf: isCurrentUserMessage ? 'flex-end' : 'flex-start',
    backgroundColor: isCurrentUserMessage ? '#8A2BE2' : '#f1f1f1', // Brighter purple
    color: isCurrentUserMessage ? 'white' : 'black',
    marginLeft: isCurrentUserMessage ? 'auto' : '0',
    marginRight: isCurrentUserMessage ? '0' : 'auto',
    borderRadius: '10px',
    padding: '8px 12px',
    maxWidth: '70%',
  };
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
const [processedMessageIds, setProcessedMessageIds] = useState(new Set());
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
        
        if (!userEmail) {
          console.error('No user email found in localStorage. Chat may not function correctly.');
        }
        
        setLoading(true);
        setError(null);
        
        // Always use the numeric userId from the backend
        // If userId is not available, we need to fetch it from the backend
        let currentUser;
        
        if (!userId) {
          console.warn('No userId found in localStorage. Attempting to fetch from server...', 
            `Stack: \n    ${new Error().stack.split('\n').slice(2, 5).join('\n    ')}`);
          try {
            // Try to get current user profile to extract the ID
            const userProfile = await API.get('/user/me');
            console.log('User profile response:', userProfile.data);
            
            if (userProfile.data && userProfile.data.id) {
              const fetchedUserId = userProfile.data.id.toString();
              // Store the ID for future use in a single location
              localStorage.setItem('userId', fetchedUserId);
              
              console.log(`Retrieved and stored user ID from profile: ${fetchedUserId}`);
              
              currentUser = {
                id: fetchedUserId,
                email: userEmail,
                username: userProfile.data.username
              };
            } else {
              console.error('User profile response does not contain an ID:', userProfile.data);
              throw new Error('Could not retrieve user ID from profile');
            }
          } catch (fetchError) {
            console.error('Error fetching user ID:', fetchError, 
              `Stack: \n    ${new Error().stack.split('\n').slice(2, 5).join('\n    ')}`);
            
            // Try to recover by making a direct API call to get the user by email
            try {
              console.log('Attempting direct user lookup by email...');
              const response = await API.get('/user/lookup', { 
                params: { email: userEmail },
                skipGlobalErrorHandling: true
              });
              
              if (response.data && response.data.id) {
                const recoveredId = response.data.id.toString();
                
                // Store in a single location as the source of truth
                localStorage.setItem('userId', recoveredId);
                
                console.log(`Recovered user ID: ${recoveredId}`);
                
                currentUser = {
                  id: recoveredId,
                  email: userEmail,
                  username: response.data.username
                };
              } else {
                throw new Error('Backup lookup failed');
              }
            } catch (backupError) {
              console.error('Backup lookup failed:', backupError);
              // Fall back to using a temporary ID if all else fails
              const temporaryId = `fallback-${Date.now()}`;
              console.warn(`Using temporary fallback ID: ${temporaryId}`);
              
              currentUser = {
                id: temporaryId,
                email: userEmail,
                pendingIdFetch: true, // Flag to indicate we need to update this ID
                retryCount: 0, // Counter for retry attempts,
                temporary: true // Mark explicitly as temporary
              };
              
              // Even though this is a fallback ID, store it so we have something consistent
              // until we can recover the real ID
              localStorage.setItem('userId', temporaryId);
              localStorage.setItem('fallbackIdTimestamp', Date.now().toString());
            }
          }
        } else {
          currentUser = {
            id: userId,
            email: userEmail
          };
        }
        
        console.log('Initializing chat with user:', currentUser);
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

// Retry user ID fetch if we used a fallback ID
useEffect(() => {
  // Function to retry fetching the user ID
  const retryUserIdFetch = async () => {
    if (!user || !user.pendingIdFetch) return;
    
    // Don't retry too many times
    if (user.retryCount && user.retryCount >= 3) {
      console.log('Max retry attempts reached for user ID fetch');
      return;
    }
    
    console.log('Retrying user ID fetch...');
    try {
      // Try to get the user's ID from the profile endpoint
      const userProfile = await API.get('/user/me', {
        skipGlobalErrorHandling: true
      });
      
      if (userProfile.data && userProfile.data.id) {
        const fetchedUserId = userProfile.data.id.toString();
        localStorage.setItem('userId', fetchedUserId);
        console.log(`Retrieved user ID on retry: ${fetchedUserId}`);
        
        // Update the user object with the real ID
        setUser(prevUser => ({
          ...prevUser,
          id: fetchedUserId,
          username: userProfile.data.username || prevUser.username,
          pendingIdFetch: false
        }));
      } else {
        // Try the lookup endpoint as backup
        const lookupResponse = await API.get('/user/lookup', {
          params: { email: user.email },
          skipGlobalErrorHandling: true
        });
        
        if (lookupResponse.data && lookupResponse.data.id) {
          const recoveredId = lookupResponse.data.id.toString();
          localStorage.setItem('userId', recoveredId);
          console.log(`Retrieved user ID from lookup: ${recoveredId}`);
          
          setUser(prevUser => ({
            ...prevUser,
            id: recoveredId,
            username: lookupResponse.data.username || prevUser.username,
            pendingIdFetch: false
          }));
        } else {
          throw new Error('Backup lookup also failed');
        }
      }
    } catch (error) {
      console.warn('Retry attempt failed:', error);
      // Increment retry count
      setUser(prevUser => ({
        ...prevUser,
        retryCount: (prevUser.retryCount || 0) + 1
      }));
      
      // Schedule another retry after delay if we haven't reached max retries
      if (!user.retryCount || user.retryCount < 2) {
        setTimeout(retryUserIdFetch, 5000 * (user.retryCount || 1));
      }
    }
  };
  
  if (user && user.pendingIdFetch) {
    // Wait a bit before retrying
    const timeoutId = setTimeout(retryUserIdFetch, 2000);
    return () => clearTimeout(timeoutId);
  }
}, [user, API]);

// Callback handlers for chat events
const handleConnected = useCallback(() => {
    console.log('Connected to chat service');
}, []);

const handleError = useCallback((error) => {
    console.error('Chat error:', error);
    setError(error.message || 'Une erreur est survenue avec le service de chat');
}, []);

const handleMessageReceived = useCallback((message) => {
    console.log('Message received in context:', message);
    // Don't add the message if it doesn't have required fields
    if (!message || !message.content) {
        console.warn('Received invalid message:', message);
        return;
    }
    
    // Convert message ID to string for consistent comparison
    const messageId = message.id ? message.id.toString() : null;
    
    // Don't add the message if we've already processed it or it's already in the messages array
    if (messageId && processedMessageIds.has(messageId)) {
        console.log('Skipping duplicate message with ID:', messageId);
        return;
    }
    
    // Add message ID to processed set if it's a server message (has an ID)
    if (messageId) {
        setProcessedMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.add(messageId);
            return newSet;
        });
    }
    
    // Update messages state
    setMessages(prevMessages => {
        // First check if we already have this exact message ID
        const existingMessageIndex = prevMessages.findIndex(m => 
            m.id && m.id.toString() === messageId
        );
        
        if (existingMessageIndex !== -1) {
            console.log('Message with this ID already exists, not adding duplicate');
            return prevMessages;
        }
        
        // For real messages with IDs from the server, replace any matching temporary messages
        if (messageId) {
            // Find any temporary messages that match this content
            const tempMessageIndex = prevMessages.findIndex(m => 
                m.temporary && m.content === message.content
            );
            
            if (tempMessageIndex !== -1) {
                console.log('Replacing temporary message with server message');
                // Replace the temporary message with the server-confirmed one
                const updatedMessages = [...prevMessages];
                updatedMessages[tempMessageIndex] = message;
                return updatedMessages;
            }
            
            // If no temporary message matches, check if there are any "exact duplicates"
            // (same content from same user within last few seconds)
            const lastFewSeconds = new Date();
            lastFewSeconds.setSeconds(lastFewSeconds.getSeconds() - 5);
            
            const duplicateContentIndex = prevMessages.findIndex(m => 
                !m.temporary && 
                m.content === message.content &&
                isCurrentUser(message.sender) &&
                m.timestamp && new Date(m.timestamp) > lastFewSeconds
            );
            
            if (duplicateContentIndex !== -1) {
                console.log('Found very similar recent message, not adding duplicate');
                return prevMessages;
            }
            
            // Otherwise, just add the new message
            return [...prevMessages, message];
        }
        
        // For temporary messages, check if we already have this content
        const duplicateContent = prevMessages.some(m => m.content === message.content);
        if (duplicateContent) {
            console.log('Message with same content already exists, not adding duplicate');
            return prevMessages;
        }
        
        // Add the new message
        return [...prevMessages, message];
    });
}, [processedMessageIds]);

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
        let roomData = {};
        
        if (type === 'global') {
            roomId = await chatService.joinGlobalChat();
            // Global admins are determined by role, we'll check in the component
        } else if (type === 'guild' && guildId) {
            roomId = await chatService.joinGuildChat(guildId);
            // For guild chats, try to get admin status from the service
            try {
                roomData = chatService.getRoomData(roomId) || {};
            } catch (e) {
                console.warn('Could not get room data:', e);
            }
        } else {
            throw new Error('Type de salon invalide ou identifiant de guilde manquant');
        }
        
        // Improved reconnection handling
        const isReconnecting = currentRoom === roomId;
        
        if (isReconnecting) {
            console.log(`Reconnecting to same room: ${roomId}, preserving state`);
            // When reconnecting to the same room:
            // 1. Keep the current messages
            // 2. Don't reset the processed message IDs
            // 3. Add any new messages received during disconnection
            
            // Get any new messages that we missed during disconnection
            const latestMessages = chatService.getMessages(roomId);
            
            if (latestMessages && latestMessages.length > 0) {
                // Merge new messages with existing ones, avoiding duplicates
                setMessages(prevMessages => {
                    // Create a set of existing message IDs for fast lookup
                    const existingIds = new Set(
                        prevMessages
                            .filter(m => m.id)
                            .map(m => m.id.toString())
                    );
                    
                    // Filter out messages we already have
                    const newMessages = latestMessages.filter(m => 
                        m.id && !existingIds.has(m.id.toString())
                    );
                    
                    console.log(`Found ${newMessages.length} new messages on reconnection`);
                    
                    if (newMessages.length > 0) {
                        // Merge and sort by timestamp if available
                        return [...prevMessages, ...newMessages].sort((a, b) => {
                            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                            return aTime - bTime;
                        });
                    }
                    
                    return prevMessages;
                });
            }
        } else {
            console.log(`Setting up new room: ${roomId}`);
            // Get messages for this room
            const roomMessages = chatService.getMessages(roomId);
            
            // Reset message tracking state for new room
            setProcessedMessageIds(new Set());
            setMessages(roomMessages);
            setCurrentRoom(roomId);
        }
        
        setLoading(false);
        
        return { roomId, isAdmin: roomData.isAdmin || false };
    } catch (err) {
        console.error('Erreur en rejoignant le salon:', err);
        setError('Impossible de rejoindre le salon de chat');
        setLoading(false);
        throw err;
    }
}, [currentRoom]);

// Leave current room
const leaveRoom = useCallback(() => {
    if (currentRoom) {
    const roomType = currentRoom.includes('guild') ? 'GUILD' : 'GLOBAL';
    const groupId = roomType === 'GUILD' ? currentRoom.split('.')[1] : null;
    
    chatService.leaveChat(roomType, groupId);
    setCurrentRoom(null);
    setMessages([]);
    setProcessedMessageIds(new Set());
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
    
    // Remove from processed IDs set to allow it to be re-added if needed
    setProcessedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
    });
    
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
    processedMessageIds,
    joinRoom,
    leaveRoom,
    sendMessage,
    deleteMessage,
    setTyping,
    setMessages // Expose setMessages to components
};

return (
    <ChatContext.Provider value={value}>
      <ChatErrorBoundary>
        {children}
      </ChatErrorBoundary>
    </ChatContext.Provider>
);
};