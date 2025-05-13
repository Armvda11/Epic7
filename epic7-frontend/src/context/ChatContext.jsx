import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  fetchGlobalChatRoom,
  fetchGuildChatRoom,
  fetchChatMessages,
  sendChatMessage,
  deleteMessage as deleteMessageService
} from "../services/ChatServices";
import ChatWebSocketService from "../services/ChatWebSocketService";
import { isAuthenticated } from "../services/authService";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [globalChatRoom, setGlobalChatRoom] = useState(null);
  const [guildChatRooms, setGuildChatRooms] = useState({});
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [webSocketStatus, setWebSocketStatus] = useState('disconnected');
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(isAuthenticated());
  
  // Store subscriptions for cleanup
  const subscriptionsRef = useRef({
    message: null,
    delete: null,
    globalDelete: null
  });

  // Track already processed delete transaction IDs to avoid duplicates
  const processedDeleteTransactionsRef = useRef(new Set());

  // Check authentication status on mount and set up listener
  useEffect(() => {
    setIsUserAuthenticated(isAuthenticated());
    
    const handleStorageChange = () => {
      const newAuthState = isAuthenticated();
      setIsUserAuthenticated(newAuthState);
      
      if (!newAuthState && ChatWebSocketService.isConnected()) {
        ChatWebSocketService.disconnect();
        setWebSocketStatus('disconnected');
      }
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
        await fetchMessages(room.id);
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
      console.log(`[ChatContext] Fetching guild chat room for guild ID: ${guildId}`);
      const room = await fetchGuildChatRoom(guildId);
      console.log(`[ChatContext] Received guild chat room:`, room);
      
      if (!room) {
        throw new Error("No valid chat room data returned");
      }
      
      setGuildChatRooms(prev => ({ ...prev, [guildId]: room }));
      setCurrentRoom(room);
      
      // Check WebSocket connection status
      const isWebSocketConnected = ChatWebSocketService.isConnected();
      console.log(`[ChatContext] WebSocket connection status for guild ${guildId}: ${isWebSocketConnected ? 'Connected' : 'Disconnected'}`);
      
      if (!isWebSocketConnected) {
        console.log(`[ChatContext] Attempting to connect WebSocket for guild ${guildId}`);
        try {
          await ChatWebSocketService.connect();
          console.log(`[ChatContext] WebSocket connected successfully for guild ${guildId}`);
        } catch (wsError) {
          console.warn(`[ChatContext] Failed to connect WebSocket for guild ${guildId}:`, wsError);
        }
      }
      
      if (room.id) {
        await fetchMessages(room.id);
      } else {
        console.error(`[ChatContext] Chat room is missing ID property:`, room);
      }
      
      return room; // Return the room to allow components to use it directly
    } catch (err) {
      console.error(`[ChatContext] Error in fetchChatRoomByGuildId:`, err);
      setError(`Failed to load guild chat room: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);
  
  // Handle message deletion events
  const handleDeleteMessage = useCallback((deleteEvent) => {
    const messageId = deleteEvent.messageId || deleteEvent.id;
    if (!messageId) return;
    
    // Normalize the messageId to string for consistent comparisons
    const normalizedMessageId = messageId.toString();
    
    // Optional transaction ID for deduplication
    const transactionId = deleteEvent.transactionId || `delete-${normalizedMessageId}-${Date.now()}`;
    
    // Skip if already processed this transaction ID
    if (processedDeleteTransactionsRef.current.has(transactionId)) {
      return;
    }
    
    // Mark as processed to avoid duplicates
    processedDeleteTransactionsRef.current.add(transactionId);
    
    // Remove the message from our state
    setMessages(prevMessages => 
      prevMessages.filter(msg => {
        // Check by ID
        const idMatch = msg.id && msg.id.toString() === normalizedMessageId;
        
        // Also check uniqueId if provided (more precise targeting)
        const uniqueIdMatch = !deleteEvent.uniqueId || 
          (msg.uniqueId && msg.uniqueId === deleteEvent.uniqueId);
          
        // Only filter out if both conditions match
        return !(idMatch && uniqueIdMatch);
      })
    );
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((data) => {
    console.log(`[ChatContext] handleMessage received data:`, data);
    
    // Process delete events
    if ((data.type === 'delete' || data.event === 'delete' || data.action === 'delete' || data.delete === true) && 
        (data.messageId || data.id)) {
      console.log(`[ChatContext] Handling delete message:`, data);
      handleDeleteMessage(data);
      return;
    }
    
    // Skip if message is missing important data
    if (!data || (!data.content && !data.text)) {
      console.log(`[ChatContext] Skipping message due to missing content:`, data);
      return;
    }
    
    // Normalize the content field if needed
    const normalizedData = { ...data };
    if (!normalizedData.content && normalizedData.text) {
      normalizedData.content = normalizedData.text;
    }
    
    console.log(`[ChatContext] Processing message with content: "${normalizedData.content}"`);
    
    // Handle regular messages
    setMessages(prev => {
      // Check for duplicates by ID
      if (normalizedData.id && prev.some(m => m.id === normalizedData.id)) {
        console.log(`[ChatContext] Skipping duplicate message with ID ${normalizedData.id}`);
        return prev;
      }
      
      // Check for duplicates by content and sender if no ID available
      if (!normalizedData.id && normalizedData.content && normalizedData.sender) {
        const isDuplicate = prev.some(m => 
          m.content === normalizedData.content && 
          m.sender?.id === normalizedData.sender?.id &&
          // Only check recent messages (within 5 seconds)
          m.timestamp && 
          new Date(m.timestamp).getTime() > Date.now() - 5000
        );
        
        if (isDuplicate) {
          console.log(`[ChatContext] Skipping duplicate message by content match:`, normalizedData.content);
          return prev; 
        }
      }
      
      console.log(`[ChatContext] Adding new message to state:`, normalizedData);
      
      // Add the new message
      return [...prev, normalizedData];
    });
  }, [handleDeleteMessage]);  // Switch chat room
  const switchRoom = useCallback(async (newRoomId, newRoomType = 'GLOBAL') => {
    if (currentRoom && currentRoom.id === newRoomId && currentRoom.type === newRoomType) {
      return true;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Unsubscribe from previous WebSocket subscriptions
      if (subscriptionsRef.current.message) {
        subscriptionsRef.current.message.unsubscribe();
      }
      if (subscriptionsRef.current.delete) {
        subscriptionsRef.current.delete.unsubscribe();
      }
      
      setMessages([]);
      
      if (newRoomType === 'GLOBAL') {
        await fetchGlobalRoom();
        
        // Set up global chat WebSocket subscription
        if (ChatWebSocketService.isConnected()) {
          console.log('[ChatContext] Setting up global chat WebSocket subscription');
          subscriptionsRef.current.message = ChatWebSocketService.subscribeToGlobalChat(
            handleMessage
          );
          
          subscriptionsRef.current.delete = ChatWebSocketService.subscribeToDeleteEvents(
            'global',
            null,
            handleDeleteMessage
          );
        }
        
        return true;
      } 
      else if (newRoomType === 'GUILD' && newRoomId) {
        const roomData = await fetchChatRoomByGuildId(newRoomId);
        
        // Get guildId from either the newRoomId or from the room data
        let guildId = newRoomId;
        
        // Extract from newRoomId if it looks like "guild-123"
        const guildIdMatch = newRoomId.toString().match(/guild-(\d+)/);
        if (guildIdMatch && guildIdMatch[1]) {
          guildId = guildIdMatch[1];
          console.log(`[ChatContext] Extracted guildId=${guildId} from roomId`);
        } 
        // Or get from room data if available
        else if (roomData && (roomData.groupId || roomData.guildId)) {
          guildId = roomData.groupId || roomData.guildId;
          console.log(`[ChatContext] Using guildId=${guildId} from room data`);
        }
        
        // Set up guild chat WebSocket subscription
        if (ChatWebSocketService.isConnected()) {
          console.log(`[ChatContext] Setting up guild chat WebSocket subscription for guild ${guildId}`);
          
          // Create a handler wrapper that adds guild ID if missing
          const guildMessageHandler = (data) => {
            // Add guildId if it's missing
            if (!data.guildId) {
              data.guildId = guildId;
            }
            // Call the original handler
            handleMessage(data);
          };
          
          subscriptionsRef.current.message = ChatWebSocketService.subscribeToGuildChat(
            guildId,
            guildMessageHandler
          );
          
          subscriptionsRef.current.delete = ChatWebSocketService.subscribeToDeleteEvents(
            'guild',
            guildId,
            handleDeleteMessage
          );
          
          // Register a direct handler for additional reliability
          const handlerId = ChatWebSocketService.addHandler('CHAT_MESSAGE', (data) => {
            if (data && data.chatType === 'GUILD' && 
                (data.guildId === guildId || !data.guildId)) {
              console.log(`[ChatContext] Direct handler received guild message:`, data);
              handleMessage({...data, guildId});
            }
          });
          
          // Store the handler ID for cleanup
          subscriptionsRef.current.directHandler = handlerId;
        } else {
          console.warn('[ChatContext] WebSocket not connected when switching to guild room');
          
          // Try to connect WebSocket
          try {
            console.log('[ChatContext] Attempting to connect WebSocket');
            await ChatWebSocketService.connect();
            console.log('[ChatContext] WebSocket connected, setting up guild subscription');
            
            subscriptionsRef.current.message = ChatWebSocketService.subscribeToGuildChat(
              guildId,
              handleMessage
            );
          } catch (wsError) {
            console.error('[ChatContext] Failed to connect WebSocket:', wsError);
          }
        }
        
        return true;
      } 
      else if (newRoomType === 'FIGHT' && newRoomId) {
        const roomDetails = {
          id: newRoomId,
          name: `Battle #${newRoomId}`,
          type: 'FIGHT'
        };
        setCurrentRoom(roomDetails);
        
        await fetchMessages(newRoomId);
        
        if (ChatWebSocketService.isConnected()) {
          subscriptionsRef.current.message = ChatWebSocketService.subscribeToDuelChat(
            newRoomId,
            handleMessage
          );
          
          subscriptionsRef.current.delete = ChatWebSocketService.subscribeToDeleteEvents(
            'duel',
            newRoomId,
            handleDeleteMessage
          );
        }
        
        return true;
      }
      
      throw new Error(`Invalid room type or ID: ${newRoomType}, ${newRoomId}`);
    } catch (error) {
      setError(`Failed to switch room: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentRoom, fetchGlobalRoom, fetchChatRoomByGuildId, fetchMessages, handleMessage, handleDeleteMessage]);

  // Send a message
  const sendMessage = useCallback(async (content, roomId, user, chatType = undefined, transactionId = null) => {
    if (!content || !roomId) {
      console.error('[ChatContext] Cannot send message: Missing content or roomId');
      throw new Error('Message content and room ID are required');
    }
    
    try {
      if (!currentRoom) {
        console.error('[ChatContext] Cannot send message: No active chat room');
        throw new Error('No active chat room');
      }
      
      // Determine chat type based on current room or passed parameter
      const effectiveChatType = chatType || currentRoom.type || 'GLOBAL';
      console.log(`[ChatContext] Sending message with chat type: ${effectiveChatType}`);
      console.log(`[ChatContext] Current room:`, currentRoom);
      console.log(`[ChatContext] Message content: "${content}"`);
      console.log(`[ChatContext] Room ID: ${roomId}`);
      
      // Generate a transaction ID if one wasn't provided
      const effectiveTransactionId = transactionId || `ctx-send-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Mark transaction as processed to prevent duplicate handling
      if (effectiveTransactionId) {
        ChatWebSocketService.markTransactionProcessed(effectiveTransactionId);
      }
      
      // Extract guildId for guild chat messages
      let guildId = null;
      if (effectiveChatType === 'GUILD') {
        // Try to get guildId from the room
        guildId = currentRoom.groupId || currentRoom.guildId;
        
        // If not found in the room object, try to extract from the roomId
        if (!guildId && roomId) {
          const guildIdMatch = roomId.toString().match(/guild-(\d+)/);
          if (guildIdMatch && guildIdMatch[1]) {
            guildId = guildIdMatch[1];
          }
        }
        
        console.log(`[ChatContext] Guild chat message, guildId: ${guildId || 'unknown'}`);
      }
      
      // Create an optimistic message to show immediately
      const optimisticId = `opt-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        content: content,
        sender: user || JSON.parse(localStorage.getItem('userData') || '{}'),
        roomId: roomId,
        timestamp: new Date().toISOString(),
        chatType: effectiveChatType,
        isOptimistic: true,
        transactionId: effectiveTransactionId
      };
      
      // Add guildId for guild messages
      if (effectiveChatType === 'GUILD' && guildId) {
        optimisticMessage.guildId = guildId;
      }
      
      // Add optimistic message to state
      console.log('[ChatContext] Adding optimistic message to state:', optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Send the message via API
      console.log('[ChatContext] Sending message via ChatServices...');
      const response = await sendChatMessage(roomId, content, effectiveChatType, effectiveTransactionId);
      console.log('[ChatContext] Message send response:', response);
      
      // Replace optimistic message with real message
      if (response) {
        console.log('[ChatContext] Replacing optimistic message with real message');
        const enhancedResponse = {
          ...response,
          fromCurrentUser: true,
          chatType: effectiveChatType,
          transactionId: effectiveTransactionId // Add transaction ID to track the message
        };
        
        // Add guildId to the response if it's a guild message
        if (effectiveChatType === 'GUILD' && guildId && !enhancedResponse.guildId) {
          enhancedResponse.guildId = guildId;
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticId ? enhancedResponse : msg
          )
        );
      }
      
      // Return the message object from the response
      return response;
    } catch (error) {
      console.error('[ChatContext] Error sending message:', error);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic || msg.content !== content));
      
      throw error;
    }
  }, [currentRoom]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId, roomId, uniqueId, transactionId) => {
    if (!messageId || !roomId) {
      throw new Error('Message ID and room ID are required');
    }
    
    try {
      // Generate transaction ID if not provided
      const txId = transactionId || `ui-delete-${messageId}-${Date.now()}`;
      
      // Mark as processed to avoid duplicates
      processedDeleteTransactionsRef.current.add(txId);
      
      // Call the API to delete the message
      await deleteMessageService(messageId, roomId, uniqueId);
      
      // Also send WebSocket delete message for immediate update
      if (ChatWebSocketService.isConnected()) {
        const deleteData = {
          messageId: messageId,
          roomId: roomId,
          uniqueId: uniqueId,
          type: 'delete',
          chatType: currentRoom?.type || 'GLOBAL',
          transactionId: txId
        };
        
        await ChatWebSocketService.deleteMessage(deleteData);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [currentRoom]);

  // Initialize WebSocket connection and set up global chat handler
  useEffect(() => {
    if (!isUserAuthenticated) return;
    
    // Attempt to connect WebSocket
    ChatWebSocketService.connect()
      .then(() => {
        setWebSocketStatus('connected');
        
        // Set up global delete event subscription
        if (!subscriptionsRef.current.globalDelete) {
          subscriptionsRef.current.globalDelete = ChatWebSocketService.subscribeToDeleteEvents(
            'global',
            null,
            handleDeleteMessage
          );
        }
      })
      .catch(error => {
        console.error('Failed to connect to WebSocket:', error);
        setWebSocketStatus('error');
      });
    
    // Set up event listeners for connection status changes
    const handleOpen = () => setWebSocketStatus('connected');
    const handleClose = () => setWebSocketStatus('disconnected');
    const handleError = () => setWebSocketStatus('error');
    
    window.addEventListener('ws:open', handleOpen);
    window.addEventListener('ws:close', handleClose);
    window.addEventListener('ws:error', handleError);
    
    // Cleanup function
    return () => {
      window.removeEventListener('ws:open', handleOpen);
      window.removeEventListener('ws:close', handleClose);
      window.removeEventListener('ws:error', handleError);
      
      // Unsubscribe from all subscriptions
      if (subscriptionsRef.current.message) {
        subscriptionsRef.current.message.unsubscribe();
      }
      if (subscriptionsRef.current.delete) {
        subscriptionsRef.current.delete.unsubscribe();
      }
      if (subscriptionsRef.current.globalDelete) {
        subscriptionsRef.current.globalDelete.unsubscribe();
      }
      
      // Remove any direct handlers
      if (subscriptionsRef.current.directHandler) {
        ChatWebSocketService.removeHandler(subscriptionsRef.current.directHandler);
      }
    };
  }, [isUserAuthenticated, handleDeleteMessage]);

  // Context value
  const value = {
    globalChatRoom,
    guildChatRooms,
    currentRoom,
    messages,
    loading,
    error,
    webSocketStatus,
    fetchGlobalRoom,
    fetchChatRoomByGuildId,
    switchRoom,
    sendMessage,
    deleteMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);