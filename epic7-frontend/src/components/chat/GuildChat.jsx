import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatInterface from './ChatInterface';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { fetchUserProfile } from '../../services/userService';
import ChatWebSocketService from '../../services/ChatWebSocketService';
import { fetchChatMessages, fetchGuildChatRoom } from '../../services/ChatServices';

/**
 * GuildChat component - Allows guild members to chat together
 */
const GuildChat = ({ guildId, guildName }) => {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { messages, loading, error, switchRoom, sendMessage, deleteMessage } = useChat();
  const [currentUser, setCurrentUser] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  const [guildRoom, setGuildRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const handlerIdRef = useRef(null);
  const messageSeenRef = useRef(new Set()); // Track seen message IDs

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserProfile();
        setCurrentUser(userData);
        
        // Store user data in localStorage for WebSocket service
        if (userData && userData.id) {
          localStorage.setItem('userData', JSON.stringify(userData));
          console.log('Stored user data in localStorage:', userData.id);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadUser();
  }, []);

  // Fetch guild chat room
  useEffect(() => {
    const loadGuildChatRoom = async () => {
      if (!guildId) return;
      
      setLoadingRoom(true);
      setLoadError(null);
      
      try {
        // Get guild chat room (creates one if it doesn't exist)
        console.log(`Attempting to fetch guild chat room for guild ${guildId}...`);
        const roomData = await fetchGuildChatRoom(guildId);
        console.log(`Guild chat room loaded for guild ${guildId}:`, roomData);
        setGuildRoom(roomData);
        
        // Switch to this room in the chat context
        if (roomData) {
          switchRoom(roomData);
        }
      } catch (error) {
        console.error(`Error loading guild chat for guild ${guildId}:`, error);
        
        // More detailed error message with server error code if available
        let errorMessage = t('errorLoadingGuildChat', language) || 'Error loading guild chat';
        
        if (error.response && error.response.data) {
          if (error.response.data.message) {
            errorMessage += `: ${error.response.data.message}`;
          } else if (error.response.data.code) {
            errorMessage += ` (${error.response.data.code})`;
          }
        }
        
        setLoadError(errorMessage);
        
        // Create a fallback room locally if we failed to load from the server
        // This allows viewing and interacting with the guild chat even if there are backend issues
        if (guildId) {
          const fallbackRoom = {
            id: `fallback-guild-${guildId}`,
            name: `${guildName || 'Guild'} Chat`,
            type: 'GUILD',
            groupId: guildId
          };
          
          console.log('Creating fallback guild room due to API error:', fallbackRoom);
          setGuildRoom(fallbackRoom);
          switchRoom(fallbackRoom);
        }
      } finally {
        setLoadingRoom(false);
      }
    };
    
    loadGuildChatRoom();
  }, [guildId, switchRoom, t, language, guildName]);

  // Initialize with context messages or fetch directly
  useEffect(() => {
    if (messages && messages.length > 0) {
      console.log('Syncing with context messages:', messages.length);
      
      // Add all message IDs to the seen set
      messages.forEach(msg => {
        if (msg.id) {
          messageSeenRef.current.add(msg.id.toString());
        }
      });
      
      setLocalMessages(messages);
    } else if (guildRoom && guildRoom.id) {
      // If context has no messages but we have a room, fetch directly
      const loadMessages = async () => {
        try {
          console.log(`Fetching messages directly for guild chat room ${guildRoom.id}`);
          const fetchedMessages = await fetchChatMessages(guildRoom.id);
          
          // Add all message IDs to the seen set
          fetchedMessages.forEach(msg => {
            if (msg.id) messageSeenRef.current.add(msg.id.toString());
          });
          
          setLocalMessages(fetchedMessages);
        } catch (err) {
          console.error('Failed to fetch guild chat messages:', err);
        }
      };
      
      loadMessages();
    }
  }, [messages, guildRoom]);

  // Initialize WebSocket connection for real-time messages
  useEffect(() => {
    if (!guildRoom || !guildRoom.id) return;
    
    console.log('Initializing WebSocket handler for guild chat:', guildRoom.id);
    
    // Create direct WebSocket handler for this component
    const handleNewMessage = (messageData) => {
      console.log('[GuildChat] Received message or event:', messageData);
      
      if (!messageData) return;
      
      // Handle delete events first using the enhanced detection
      const isDeleteMessage = 
        // Standard delete type
        (messageData.type === 'delete') || 
        // Alternative event/action format
        (messageData.event === 'delete') || 
        (messageData.action === 'delete') ||
        // Check explicit delete property 
        (messageData.delete === true);
      
      // Get message ID from either messageId or id property
      const messageId = messageData.messageId || messageData.id;
      
      // Process any recognized delete message format
      if (isDeleteMessage && messageId) {
        console.log(`[GuildChat] Delete event received for message: ${messageId}`);
        messageSeenRef.current.delete(messageId.toString());
        
        // More precise deletion with uniqueId if available
        setLocalMessages(prev => {
          const targetIndex = prev.findIndex(msg => 
            (msg.id && msg.id.toString() === messageId.toString()) && 
            (messageData.uniqueId ? msg.uniqueId === messageData.uniqueId : true)
          );
          
          if (targetIndex === -1) {
            console.log(`[GuildChat] Message with ID ${messageId} not found for deletion`);
            return prev; // Message not found
          }
          
          console.log(`[GuildChat] Removing message at index ${targetIndex}`);
          // Create a new array without the target message
          return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
        });
        return;
      }
      
      // Continue with regular message handling
      
      // Skip if we've already seen this message
      if (messageData.id && messageSeenRef.current.has(messageData.id.toString())) {
        console.log('[GuildChat] Skipping already seen message:', messageData.id);
        return;
      }
      
      // Skip messages for other rooms
      if (messageData.roomId && messageData.roomId !== guildRoom.id) {
        console.log(`[GuildChat] Skipping message for different room: ${messageData.roomId} vs ${guildRoom.id}`);
        return;
      }
      
      // Add to seen set
      if (messageData.id) {
        messageSeenRef.current.add(messageData.id.toString());
      }
      
      // Add roomId to message if missing
      const message = {
        ...messageData,
        roomId: messageData.roomId || guildRoom.id
      };
      
      // If the user is the sender, mark the message
      if (currentUser && message.sender && message.sender.id === currentUser.id) {
        message.fromCurrentUser = true;
      }
      
      // Update the local messages state immediately
      setLocalMessages(prev => {
        // First check if this is a confirmation of an optimistic message
        const optimisticIndex = prev.findIndex(m => 
          m.isOptimistic && 
          m.content === message.content && 
          m.sender?.id === message.sender?.id
        );
        
        if (optimisticIndex !== -1) {
          // Replace the optimistic message with the confirmed one
          const newMessages = [...prev];
          newMessages[optimisticIndex] = {
            ...message,
            fromCurrentUser: prev[optimisticIndex].fromCurrentUser
          };
          return newMessages;
        }
        
        // Check if message already exists to avoid duplicates
        const isDuplicate = prev.some(m => m.id === message.id);
        if (isDuplicate) return prev;
        
        // Add the new message
        return [...prev, message];
      });
    };
    
    // Register this component's message handler with the WebSocket service
    // Listen for both direct CHAT_MESSAGE events and events that come through onChatMessage
    const handlerId1 = ChatWebSocketService.addHandler('CHAT_MESSAGE', handleNewMessage);
    const handlerId2 = ChatWebSocketService.addHandler('onChatMessage', handleNewMessage);
    // Add explicit handlers for delete events
    const handlerId3 = ChatWebSocketService.addHandler('onMessageDeleted', handleNewMessage);
    const handlerId4 = ChatWebSocketService.addHandler('MESSAGE_DELETED', handleNewMessage);
    handlerIdRef.current = [handlerId1, handlerId2, handlerId3, handlerId4];
    
    console.log('[GuildChat] Registered message handlers with IDs:', handlerIdRef.current);
    
    // Subscribe to guild chat and delete events
    let chatSubscription, deleteSubscription;
    if (guildRoom && guildRoom.id) {
      chatSubscription = ChatWebSocketService.subscribeToGuildChat(guildId, handleNewMessage);
      deleteSubscription = ChatWebSocketService.subscribeToDeleteEvents('guild', guildId, handleNewMessage);
      console.log(`[GuildChat] Subscribed to guild ${guildId} chat and delete events`);
    }
    
    // Connect to room if not already connected
    if (!ChatWebSocketService.isConnected() || ChatWebSocketService.roomId !== guildRoom.id) {
      console.log('[GuildChat] Connecting to guild chat room:', guildRoom.id);
      ChatWebSocketService.connect(guildRoom.id);
    }
    
    // Cleanup function
    return () => {
      if (handlerIdRef.current) {
        console.log('[GuildChat] Removing message handlers:', handlerIdRef.current);
        handlerIdRef.current.forEach(id => ChatWebSocketService.removeHandler(id));
      }
      
      if (chatSubscription && typeof chatSubscription.unsubscribe === 'function') {
        console.log('[GuildChat] Unsubscribing from guild chat');
        chatSubscription.unsubscribe();
      }
      
      if (deleteSubscription && typeof deleteSubscription.unsubscribe === 'function') {
        console.log('[GuildChat] Unsubscribing from delete events');
        deleteSubscription.unsubscribe();
      }
    };
  }, [guildRoom, guildId, currentUser]);

  // Handle send message
  const handleSendMessage = async (content) => {
    if (!guildRoom || !guildRoom.id) {
      console.error('[GuildChat] Cannot send message - no guild room');
      return;
    }
    
    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`;
    const uniqueId = `msg-${optimisticId}-${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage = {
      id: optimisticId,
      uniqueId: uniqueId,
      content: content,
      timestamp: new Date().toISOString(),
      roomId: guildRoom.id,
      sender: currentUser,
      fromCurrentUser: true,
      isOptimistic: true,
      sending: true, // Mark as sending
      chatType: "GUILD" // Explicitly mark as GUILD chat type
    };
    
    // Add optimistic message immediately
    setLocalMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket first for fastest delivery
    try {
      await ChatWebSocketService.sendMessage({
        roomId: guildRoom.id,
        content: content,
        clientId: optimisticId, // Include the optimistic ID to match messages
        chatType: "GUILD" // Explicitly set chat type to GUILD
      });
      
      // If no error, the message will be confirmed by the incoming WebSocket broadcast
      // If there's no WebSocket response within 1s, we'll fall back to REST API
      setTimeout(async () => {
        const messageExists = localMessages.some(m => 
          (m.id === optimisticId && !m.sending) || // Already got websocket confirmation
          m.clientId === optimisticId // Or matched by client ID
        );
        
        if (!messageExists) {
          // WebSocket broadcast failed or is taking too long, try REST API as fallback
          console.log('[GuildChat] WebSocket broadcast not received, falling back to REST API');
          try {
            await sendMessage(guildRoom.id, content, currentUser, "GUILD"); // Pass chat type to REST API call
          } catch (error) {
            console.error('[GuildChat] Failed to send message via REST API:', error);
            // Mark the message as failed
            setLocalMessages(prev => 
              prev.map(m => m.id === optimisticId 
                ? { ...m, sending: false, failed: true } 
                : m
              )
            );
          }
        }
      }, 1000); // Wait 1 second before falling back to REST API
    } catch (wsError) {
      console.error('[GuildChat] WebSocket message send failed:', wsError);
      // WebSocket failed, try REST API immediately
      try {
        await sendMessage(guildRoom.id, content, currentUser, "GUILD"); // Pass chat type to REST API call
      } catch (restError) {
        console.error('[GuildChat] Failed to send message via REST API:', restError);
        // Mark the message as failed
        setLocalMessages(prev => 
          prev.map(m => m.id === optimisticId 
            ? { ...m, sending: false, failed: true } 
            : m
          )
        );
      }
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId, messageUniqueId) => {
    console.log(`[GuildChat] Deleting message with ID: ${messageId}, uniqueId: ${messageUniqueId || 'not provided'}`);
    
    if (!guildRoom || !guildRoom.id) {
      console.error('[GuildChat] Cannot delete message - no guild room');
      return;
    }
    
    // Generate a unique transaction ID for this delete operation
    const transactionId = `ui-delete-${messageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Remove from seen set
    messageSeenRef.current.delete(messageId.toString());
    
    // Remove from local messages immediately - use more precise targeting with uniqueId
    setLocalMessages(prev => {
      const targetIndex = prev.findIndex(msg => 
        (msg.id && msg.id.toString() === messageId.toString()) && 
        (messageUniqueId ? msg.uniqueId === messageUniqueId : true)
      );
      
      if (targetIndex === -1) {
        console.log(`[GuildChat] Message with ID ${messageId} not found in local state`);
        return prev; // Message not found
      }
      
      console.log(`[GuildChat] Removing message at index ${targetIndex}`);
      // Create a new array without the target message
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
    
    try {
      // Delete via chat context, passing the uniqueId for more precision
      await deleteMessage(messageId, guildRoom.id, messageUniqueId);
      
      // Also directly broadcast the delete via WebSocket as an additional safeguard
      await ChatWebSocketService.deleteMessage({
        messageId,
        roomId: guildRoom.id,
        uniqueId: messageUniqueId,
        transactionId,
        chatType: "GUILD"  // Explicitly specify the chat type
      });
      
      console.log(`Message ${messageId} successfully deleted`);
    } catch (error) {
      console.error(`[GuildChat] Error deleting message ${messageId}:`, error);
    }
  };

  // Return to guilds page
  const handleBack = () => {
    navigate('/guilds');
  };

  // Combined error handling for loading errors or chat errors
  const displayError = error || loadError;
  
  if (displayError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-500">{t('error', language)}</h2>
          <p>{displayError}</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToGuilds', language)}
          </button>
        </div>
      </div>
    );
  }

  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border.purple-500 mx-auto mb-4"></div>
          <p>{t('loadingGuildChat', language) || 'Loading guild chat...'}</p>
        </div>
      </div>
    );
  }

  // Use local messages for display
  const displayMessages = localMessages;
  const displayRoomName = guildRoom?.name || guildName || t('guildChat', language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button 
          onClick={handleBack}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaArrowLeft /> {t('backToGuilds', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaUsers className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">{displayRoomName}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{t('chatWithGuildMembers', language)}</p>
        </header>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl">
          <ChatInterface 
            messages={displayMessages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={currentUser}
            loading={loading}
            roomName={displayRoomName}
            chatType="GUILD"
            canDelete={true}
          />
        </div>

        {/* Guild Chat Info */}
        <div className="mt-6 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('guildChatInfo', language) || 'Use this chat to coordinate with your guild members and plan strategies.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuildChat;