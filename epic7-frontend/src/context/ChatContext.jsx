import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  fetchGlobalChatRoom,
  fetchGuildChatRoom,
  fetchChatMessages,
  sendChatMessage,
  deleteMessage as deleteMessageService
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
    delete: null,
    globalDelete: null
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

  // Store already processed delete transaction IDs to avoid duplicates
  const processedDeleteTransactionsRef = useRef(new Set());
  
  // Handle message deletion events specifically
  const handleDeleteMessage = useCallback((deleteEvent) => {
    console.log('[ChatContext] Received delete event:', deleteEvent);
    
    // Normalize the messageId - could be in messageId or id property
    const messageId = deleteEvent?.messageId || deleteEvent?.id;
    
    // Generate or use provided transaction ID to track this unique delete operation
    const transactionId = deleteEvent?.transactionId || `${messageId}-${Date.now()}`;
    
    // Check if we've already processed this delete event
    if (processedDeleteTransactionsRef.current.has(transactionId)) {
      console.log(`[ChatContext] Skipping already processed delete event: ${transactionId}`);
      return; // Already processed this delete event
    }
    
    // The deleteEvent should contain messageId, roomId, and potentially uniqueId
    if (deleteEvent && messageId) {
      const uniqueId = deleteEvent.uniqueId;
      
      // Add this transaction to processed set to avoid duplicate processing
      processedDeleteTransactionsRef.current.add(transactionId);
      
      // Limit size of processed transactions set to prevent memory leaks
      if (processedDeleteTransactionsRef.current.size > 100) {
        // Convert to array, remove oldest items, and convert back to set
        const transactionsArray = Array.from(processedDeleteTransactionsRef.current);
        processedDeleteTransactionsRef.current = new Set(transactionsArray.slice(-50));
      }
      
      // Remove the message from the messages state using uniqueId if available
      setMessages(prev => {
        // If we have a uniqueId, we can be more precise with our deletion
        if (uniqueId) {
          console.log(`[ChatContext] Looking for message with ID ${messageId} and uniqueId ${uniqueId}`);
          const targetIndex = prev.findIndex(msg => 
            (msg.id && msg.id.toString() === messageId.toString()) && 
            msg.uniqueId === uniqueId
          );
          
          if (targetIndex === -1) {
            console.log(`[ChatContext] Message with ID ${messageId} and uniqueId ${uniqueId} not found`);
            return prev; // Message not found
          }
          
          console.log(`[ChatContext] Removing message at index ${targetIndex}`);
          // Create a new array without the target message
          return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
        } 
        // Without uniqueId, we fall back to the old method but with improved string comparison
        else {
          console.log(`[ChatContext] Looking for message with ID ${messageId} (no uniqueId provided)`);
          const beforeCount = prev.length;
          const filtered = prev.filter(msg => 
            !(msg.id && msg.id.toString() === messageId.toString())
          );
          const afterCount = filtered.length;
          
          const deleted = beforeCount - afterCount;
          console.log(`[ChatContext] Deleted ${deleted} message(s) with ID ${messageId} (no uniqueId provided)`);
          
          return filtered;
        }
      });
      console.log(`[ChatContext] Message ${messageId} delete event processed with transaction ${transactionId}`);
    } else {
      console.warn('[ChatContext] Received malformed delete event:', deleteEvent);
    }
  }, []);

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
    
    // Check for all possible delete event formats
    const isDeleteEvent = 
      (data.type === 'delete') || 
      (data.event === 'delete') || 
      (data.action === 'delete') ||
      (data.delete === true);
    
    // Handle delete events
    if (isDeleteEvent) {
      console.log('[ChatContext] Received delete event via handleMessage:', data);
      
      // Don't process if we don't have message ID
      const messageId = data?.messageId || data?.id;
      if (!messageId) {
        console.warn('[ChatContext] Delete event missing messageId:', data);
        return;
      }
      
      // Generate transaction ID for deduplication if not present
      if (!data.transactionId) {
        data.transactionId = `delete-${messageId}-${Date.now()}`;
        console.log(`[ChatContext] Generated transaction ID: ${data.transactionId}`);
      }
      
      // Call our dedicated delete handler to ensure consistent handling
      handleDeleteMessage(data);
      return;
    }
    
    // Handle regular messages
    setMessages(prev => {
      // Check for duplicates
      if (prev.some(m => m.id === data.id)) return prev;
      
      // Add the new message
      return [...prev, data];
    });
  }, [handleDeleteMessage]);

  // Switch chat room
  const switchRoom = useCallback(async (newRoomId, newRoomType = 'GLOBAL') => {
    console.log(`Switching room to ${newRoomType} room ${newRoomId}`);
    
    if (currentRoom && currentRoom.id === newRoomId && currentRoom.type === newRoomType) {
      console.log('Already in this room, no need to switch');
      return true;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Unsubscribe from previous WebSocket subscriptions if needed
      if (subscriptionsRef.current.message) {
        subscriptionsRef.current.message.unsubscribe();
      }
      if (subscriptionsRef.current.delete) {
        subscriptionsRef.current.delete.unsubscribe();
      }
      
      // Clear current messages
      setMessages([]);
      
      // Fetch message history for the new room
      let fetchedMessages = [];
      let roomDetails = null;
      
      if (newRoomType === 'GLOBAL') {
        // Use existing fetchGlobalRoom logic to get global chat room
        await fetchGlobalRoom();
        return true; // fetchGlobalRoom already sets messages and currentRoom
      } 
      else if (newRoomType === 'GUILD' && newRoomId) {
        // Use existing fetchChatRoomByGuildId logic to get guild chat room
        await fetchChatRoomByGuildId(newRoomId);
        return true; // fetchChatRoomByGuildId already sets messages and currentRoom
      } 
      else if (newRoomType === 'FIGHT' && newRoomId) {
        try {
          // We may need to implement a fetchDuelChatRoom function
          // For now, manually set the room
          roomDetails = {
            id: newRoomId,
            name: `Battle #${newRoomId}`,
            type: 'FIGHT'
          };
          setCurrentRoom(roomDetails);
          
          // Fetch messages for this duel chat
          await fetchMessages(newRoomId);
          
          // Set up WebSocket subscriptions for this room
          if (ChatWebSocketService.isConnected()) {
            // Subscribe to messages in this duel chat
            const messageSubscription = ChatWebSocketService.subscribeToDuelChat(
              newRoomId, 
              handleMessage
            );
            
            // Subscribe to deletion events for this duel chat
            const deleteSubscription = ChatWebSocketService.subscribeToDeleteEvents(
              'FIGHT',
              newRoomId,
              handleDeleteMessage
            );
            
            // Save subscriptions for later cleanup
            subscriptionsRef.current.message = messageSubscription;
            subscriptionsRef.current.delete = deleteSubscription;
          }
        } catch (error) {
          console.error('Error setting up duel chat room:', error);
          setError('Failed to set up duel chat room');
          return false;
        }
      } else {
        setError('Invalid room type or room ID');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error switching chat room:', error);
      setError('Failed to switch chat room');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchGlobalRoom, fetchChatRoomByGuildId, fetchMessages, handleMessage, handleDeleteMessage]);

  /**
   * Send a message to the current chat room
   * @param {string} roomId - Chat room ID
   * @param {string} content - Message content
   * @param {object} user - User sending the message
   * @param {string} chatType - Type of chat (GLOBAL, GUILD, or FIGHT)
   */
  const sendMessage = async (roomId, content, user, chatType = "GLOBAL") => {
    if (!roomId || !content) {
      console.error('Cannot send message: roomId or content missing');
      return null;
    }

    try {
      // First try to send via WebSocket for real-time delivery
      if (ChatWebSocketService.isConnected()) {
        try {
          console.log(`Sending message to room ${roomId} via WebSocket with type ${chatType}`);
          await ChatWebSocketService.sendMessage({
            roomId,
            content,
            chatType // Include chat type for proper routing
          });
          // If no error is thrown, assume success and return early
          return true;
        } catch (wsError) {
          console.warn('WebSocket send failed, falling back to REST API:', wsError);
          // Continue to REST API fallback
        }
      }

      // Fallback to REST API for message sending
      console.log(`Sending message to room ${roomId} via REST API`);
      const messageData = await sendChatMessage(roomId, content, chatType);
      
      // Add the sent message to our messages state
      if (messageData) {
        const newMessage = {
          ...messageData,
          chatType, // Make sure chat type is included
          fromCurrentUser: user && messageData.sender && messageData.sender.id === user.id
        };
        
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        return newMessage;
      }
      return null;
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message. Please try again.');
      return null;
    }
  };

  // Delete a message
  const deleteMessage = async (messageId, roomId, uniqueId, transactionId) => {
    if (!messageId || !roomId) {
      console.error('[ChatContext] Cannot delete message: Missing messageId or roomId');
      return false;
    }
    
    try {
      setLoading(true);
      
      // Use provided transaction ID or generate a new one
      const deleteTransactionId = transactionId || `context-delete-${messageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Track this transaction in our local cache to avoid duplicate processing
      if (processedDeleteTransactionsRef.current.has(deleteTransactionId)) {
        console.log(`[ChatContext] Skipping already in-progress delete transaction: ${deleteTransactionId}`);
        return true; // Act as if it succeeded since we're already processing it
      }
      
      // Mark this transaction as processed to prevent duplicates
      processedDeleteTransactionsRef.current.add(deleteTransactionId);
      
      // Also check for any recent transactions for this message ID
      const recentDeleteForThisMessage = Array.from(processedDeleteTransactionsRef.current)
        .filter(tid => 
          tid !== deleteTransactionId && // Not the current transaction
          tid.includes(`-${messageId}-`) && // Contains the message ID
          (tid.startsWith('context-delete-') || tid.startsWith('delete-')) // Is a delete transaction
        );
        
      if (recentDeleteForThisMessage.length > 0) {
        console.log(`[ChatContext] Warning: Processing multiple delete transactions for message ID ${messageId} in quick succession`);
        // We'll still continue but log a warning
      }
      
      console.log(`[ChatContext] Deleting message ${messageId}, uniqueId: ${uniqueId || 'not provided'}, roomId: ${roomId}, transactionId: ${deleteTransactionId}`);
      
      // First try the REST API service method
      const success = await deleteMessageService(messageId, roomId, uniqueId);
      
      if (success) {
        // Remove the message from our local context state immediately using a more precise approach with uniqueId
        setMessages(prev => {
          const targetIndex = prev.findIndex(msg => 
            (msg.id && msg.id.toString() === messageId.toString()) && 
            (uniqueId ? msg.uniqueId === uniqueId : true)
          );
          
          if (targetIndex === -1) {
            console.log(`[ChatContext] Message with ID ${messageId} not found in context state`);
            return prev; // Message not found
          }
          
          console.log(`[ChatContext] Removing message at index ${targetIndex} from context state`);
          // Create a new array without the target message
          return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
        });
        
        console.log(`[ChatContext] Successfully deleted message ${messageId} via REST API. Broadcasting via WebSocket...`);
        
        // Also notify WebSocket service to broadcast the deletion to all clients
        if (ChatWebSocketService.isConnected()) {
          try {
            // This will broadcast the delete event to all connected clients
            await ChatWebSocketService.deleteMessage({
              messageId,
              id: messageId, // Include as id field for redundancy
              roomId,
              uniqueId,
              type: 'delete', // Explicitly identify as delete message
              transactionId: deleteTransactionId // Pass transaction ID for deduplication
            });
            console.log('[ChatContext] Message deletion broadcast successfully via WebSocket');
          } catch (wsError) {
            console.warn('[ChatContext] WebSocket broadcast of deletion failed, but message was deleted:', wsError);
            // Even if WebSocket broadcast fails, we can manually notify all subscribers
            // This ensures that at least clients on this browser get the update
            ChatWebSocketService.notifyHandlers('onMessageDeleted', {
              type: 'delete', // Explicitly set type
              messageId,
              id: messageId, // Include as id field for redundancy
              roomId,
              uniqueId,
              transactionId: deleteTransactionId // Pass transaction ID for deduplication
            });
          }
        } else {
          console.warn('[ChatContext] WebSocket not connected, manually notifying handlers about deletion');
          // If not connected to WebSocket, manually broadcast the delete event
          ChatWebSocketService.notifyHandlers('onMessageDeleted', {
            type: 'delete', // Explicitly set type
            messageId,
            id: messageId, // Include as id field for redundancy
            roomId,
            uniqueId,
            transactionId: deleteTransactionId // Pass transaction ID for deduplication
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
      return false;
    } finally {
      setLoading(false);
    }
  };

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
          
          // Once connected, set up global subscriptions
          if (!subscriptionsRef.current.globalDelete) {
            console.log('[ChatContext] Setting up global delete event subscription');
            subscriptionsRef.current.globalDelete = ChatWebSocketService.subscribeToDeleteEvents(
              'global', 
              null, 
              handleDeleteMessage
            );
          }
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
    const handleOpen = () => {
      setWebSocketStatus('connected');
      // Setup global delete subscription on reconnection
      if (!subscriptionsRef.current.globalDelete) {
        console.log('[ChatContext] Setting up global delete event subscription after reconnection');
        subscriptionsRef.current.globalDelete = ChatWebSocketService.subscribeToDeleteEvents(
          'global', 
          null, 
          handleDeleteMessage
        );
      }
    };
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
      if (subscriptionsRef.current.globalDelete) {
        subscriptionsRef.current.globalDelete.unsubscribe();
      }
      
      // Do not disconnect WebSocket on component unmount
      // as it should persist across the application
      // Only disconnect on logout which is handled elsewhere
    };
  }, [webSocketStatus, isUserAuthenticated, handleDeleteMessage]);

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
    deleteMessage,
    sendTypingStatus
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);