// filepath: c:\Users\coren\Documents\Projets\Epic7\epic7-frontend\src\components\chat\ChatRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatWebSocketService from '../../services/ChatWebSocketService';
import { fetchUserProfile } from '../../services/userService';

/**
 * ChatRoom component - A reusable chat room that handles real-time message updates
 */
const ChatRoom = ({ roomId, roomName, chatType, onBack }) => {
  const { t, language } = useSettings();
  const { messages: contextMessages, sendMessage, deleteMessage, loading } = useChat();
  const [localMessages, setLocalMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const subscriptionsRef = useRef([]); // Track subscriptions for cleanup
  // Track message IDs to avoid duplicates
  const messageSeenRef = useRef(new Set());
  
  // Track processed delete transactions to avoid duplicate processing
  const processedDeleteTransactionsRef = useRef(new Set());
  
  const messageContainerRef = useRef(null);

  // Helper function to handle delete events
  const handleDeleteEvent = (data) => {
    // Normalize the message ID and ensure it's present
    const messageId = data.messageId || data.id;
    if (!messageId) {
      console.warn(`[ChatRoom] Delete event missing messageId: ${JSON.stringify(data)}`);
      return;
    }

    // Remove from seen messages set
    messageSeenRef.current.delete(messageId.toString());

    // Remove the message from localMessages for ALL users
    setLocalMessages(prev => {
      // Find the message by id and uniqueId (if present)
      const targetIndex = prev.findIndex(msg => {
        const idMatch = msg.id && msg.id.toString() === messageId.toString();
        const uniqueIdMatch = !data.uniqueId || (msg.uniqueId && msg.uniqueId === data.uniqueId);
        return idMatch && uniqueIdMatch;
      });
      if (targetIndex === -1) {
        // Message not found, just return prev
        return prev;
      }
      // Remove the message
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
  };

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserProfile();
        setCurrentUser(userData);
        
        // Store user data for WebSocket service
        if (userData && userData.id) {
          localStorage.setItem('userData', JSON.stringify(userData));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setError('Could not load your profile. Please try again later.');
      }
    };

    loadUser();
  }, []);

  // Initialize with context messages
  useEffect(() => {
    if (contextMessages && contextMessages.length > 0) {
      console.log(`Received ${contextMessages.length} messages from context`);
      
      // Process messages to mark which are from the current user
      const processedMessages = contextMessages.map(msg => {
        // Track seen message IDs
        if (msg.id) messageSeenRef.current.add(msg.id.toString());
        
        // More robust check for messages from current user
        const isFromCurrentUser = 
          // Check if already marked
          msg.fromCurrentUser || 
          // Check sender ID against current user ID
          (currentUser && msg.sender && msg.sender.id === currentUser.id) ||
          // Check senderId property
          (currentUser && msg.senderId && msg.senderId === currentUser.id) ||
          // Check sender username
          (currentUser && msg.sender && currentUser.username && 
          msg.sender.username === currentUser.username);
        
        return {
          ...msg,
          fromCurrentUser: isFromCurrentUser
        };
      });
      
      // Sort messages chronologically
      const sortedMessages = [...processedMessages].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
      
      setLocalMessages(sortedMessages);
    }
  }, [contextMessages, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // Set up WebSocket handlers for real-time messages
  useEffect(() => {
    if (!roomId || !currentUser) return;
    
    console.log(`Setting up WebSocket handlers for room ${roomId}`);
    
    // Handler for messages coming from WebSocket
    const handleMessage = (data) => {
      console.log('[ChatRoom] WebSocket message received:', data);
      
      // Enhanced detection for different delete message formats
      const isDeleteMessage = 
        // Standard delete type
        (data.type === 'delete') || 
        // Alternative event/action format
        (data.event === 'delete') || 
        (data.action === 'delete') ||
        // Check explicit delete property 
        (data.delete === true);
      
      // Get message ID from either messageId or id property
      const messageId = data.messageId || data.id;
      
      // Process any recognized delete message format
      if (isDeleteMessage && messageId) {
        console.log(`[ChatRoom] Delete event detected: ${JSON.stringify(data)}`);
        
        // Normalize the event format for consistent processing
        const deleteEvent = {
          type: 'delete',
          messageId: messageId,
          roomId: data.roomId || roomId,
          uniqueId: data.uniqueId,
          sender: data.sender || data.username,
          // Preserve transaction ID if present, or generate one
          transactionId: data.transactionId || `chatroom-delete-${messageId}-${Date.now()}`
        };
        
        // Process the standardized delete event
        handleDeleteEvent(deleteEvent);
        return;
      }
      
      // Skip if not a valid message
      if (!data) return;
      
      // Special handling for delete events was already handled above
      // Here we only handle normal messages but make sure to allow delete type messages to pass through
      if (data.type && data.type !== 'delete' && data.type !== 'message') return;
      
      // Check if message belongs to this room
      if (data.roomId && data.roomId.toString() !== roomId.toString()) {
        console.log(`Message for room ${data.roomId}, but we're in ${roomId}`);
        return;
      }
      
      // More robust check to determine if message is from current user
      const isFromCurrentUser = 
        // Check if marked as fromCurrentUser by the service
        data.fromCurrentUser || 
        // Check sender ID
        (data.sender && currentUser && data.sender.id === currentUser.id) ||
        // Check senderId from our enhanced service
        (data.senderId && currentUser && data.senderId === currentUser.id) ||
        // Check sender username
        (data.sender && currentUser && data.sender.username === currentUser.username);
      
      console.log(`Message from ${data.sender?.username}, isFromCurrentUser: ${isFromCurrentUser}`);

      // If we've already seen this message ID, ignore it
      if (data.id && messageSeenRef.current.has(data.id.toString())) {
        console.log('Skipping already seen message:', data.id);
        return;
      }
      
      // Add to seen set to prevent duplication
      if (data.id) {
        messageSeenRef.current.add(data.id.toString());
      }

      // For messages from current user - either replace the optimistic message
      // or add as a new message with the correct styling
      if (isFromCurrentUser) {
        setLocalMessages(prevMessages => {
          // Look for a matching optimistic message to replace
          const optimisticIndex = prevMessages.findIndex(m => 
            m.isOptimistic && 
            m.content === data.content && 
            (m.sender?.id === data.sender?.id || 
            m.sender?.username === data.sender?.username)
          );
          
          if (optimisticIndex !== -1) {
            console.log(`[ChatRoom] Replacing optimistic message at index ${optimisticIndex} with confirmed message:`, data.id);
            
            // Replace the optimistic message with the confirmed one
            const newMessages = [...prevMessages];
            newMessages[optimisticIndex] = {
              ...data,
              fromCurrentUser: true // Ensure it's marked as from current user
            };
            
            return newMessages;
          }
          
          // More comprehensive duplicate detection
          const isDuplicate = prevMessages.some(m => {
            // If IDs match exactly, it's definitely a duplicate
            const idMatch = data.id && m.id && m.id.toString() === data.id.toString();
            
            // If uniqueIds match, it's a duplicate
            const uniqueIdMatch = data.uniqueId && m.uniqueId && m.uniqueId === data.uniqueId;
            
            // Check content + sender + timestamp proximity
            const contentSenderMatch = 
              m.content === data.content && 
              ((m.sender?.id && data.sender?.id && m.sender.id === data.sender.id) ||
               (m.sender?.username && data.sender?.username && m.sender.username === data.sender.username));
            
            // Increased time window for duplicate detection (5 seconds)
            const timeProximity = Math.abs(new Date(m.timestamp || 0) - new Date(data.timestamp || 0)) < 5000;
            
            // A message is a duplicate if:
            // - The IDs match, OR
            // - The uniqueIds match, OR
            // - Content & sender match AND the timestamps are close
            const isDup = idMatch || uniqueIdMatch || (contentSenderMatch && timeProximity);
            
            if (isDup) {
              console.log(`[ChatRoom] Duplicate message from current user detected:`, 
                idMatch ? 'ID match' : (uniqueIdMatch ? 'uniqueId match' : 'content+sender+time match'));
            }
            
            return isDup;
          });
          
          if (isDuplicate) {
            console.log('[ChatRoom] Duplicate message from current user detected and skipped:', data);
            return prevMessages;
          }
          
          // If we don't have this message at all, add it with the correct fromCurrentUser flag
          console.log('[ChatRoom] Adding new message from current user:', data.id);
          const updatedMessages = [...prevMessages, {
            ...data,
            fromCurrentUser: true, // Crucial for correct styling
            uniqueId: data.uniqueId || `msg-${data.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Add unique identifier if not present
          }];
          
          return updatedMessages.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });
        });
        
        return; // Skip the rest of processing
      }
      
      // For messages from other users
      setLocalMessages(prevMessages => {
        // Check if we already have this message
        // Perform more thorough duplicate detection with increased time window
        const isDuplicate = prevMessages.some(m => {
          // If IDs match exactly, it's definitely a duplicate
          const idMatch = data.id && m.id && m.id.toString() === data.id.toString();
          
          // If uniqueIds match, it's a duplicate
          const uniqueIdMatch = data.uniqueId && m.uniqueId && m.uniqueId === data.uniqueId;
          
          // Check content + sender + timestamp proximity
          const contentSenderMatch = 
            m.content === data.content && 
            ((m.sender?.id && data.sender?.id && m.sender.id === data.sender.id) ||
             (m.sender?.username && data.sender?.username && m.sender.username === data.sender.username));
          
          // Increased time window for duplicate detection
          const timeProximity = Math.abs(new Date(m.timestamp || 0) - new Date(data.timestamp || 0)) < 5000;
          
          // A message is a duplicate if:
          // - The IDs match, OR
          // - The uniqueIds match, OR
          // - Content & sender match AND the timestamps are close
          const isDup = idMatch || uniqueIdMatch || (contentSenderMatch && timeProximity);
          
          if (isDup) {
            console.log(`[ChatRoom] Duplicate message detected from ${data.sender?.username}:`, 
              idMatch ? 'ID match' : (uniqueIdMatch ? 'uniqueId match' : 'content+sender+time match'));
          }
          
          return isDup;
        });
        
        if (isDuplicate) {
          console.log('[ChatRoom] Skipping duplicate message:', data);
          return prevMessages;
        }
        
        // Log that we're adding a new message
        console.log(`[ChatRoom] Adding new message from ${data.sender?.username}:`, 
          data.id ? `ID: ${data.id}` : 'no ID', 
          data.uniqueId ? `uniqueId: ${data.uniqueId}` : 'no uniqueId'
        );
        
        // Add the new message from another user with guaranteed uniqueId
        const newMessage = {
          ...data,
          fromCurrentUser: false, // Ensure it's marked as NOT from current user
          roomId: data.roomId || roomId,
          uniqueId: data.uniqueId || `msg-${data.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Add unique identifier if not present
        };
        
        const updatedMessages = [...prevMessages, newMessage];
        return updatedMessages.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeA - timeB;
        });
      });
    };
    
    // Connect to the appropriate chat type
    let subscription;
    let deleteSubscription;
    if (chatType === 'GLOBAL') {
      subscription = ChatWebSocketService.subscribeToGlobalChat(handleMessage);
      deleteSubscription = ChatWebSocketService.subscribeToDeleteEvents('global', null, handleDeleteEvent);
    } else if (chatType === 'GUILD' && roomId) {
      subscription = ChatWebSocketService.subscribeToGuildChat(roomId, handleMessage);
      deleteSubscription = ChatWebSocketService.subscribeToDeleteEvents('guild', roomId, handleDeleteEvent);
    } else if (chatType === 'FIGHT' || chatType === 'DUEL') {
      subscription = ChatWebSocketService.subscribeToDuelChat(roomId, handleMessage);
      deleteSubscription = ChatWebSocketService.subscribeToDeleteEvents('duel', roomId, handleDeleteEvent);
    }
    
    if (subscription) {
      subscriptionsRef.current.push(subscription);
    }
    
    if (deleteSubscription) {
      subscriptionsRef.current.push(deleteSubscription);
      console.log(`[ChatRoom] Subscribed to delete events for ${chatType} room ${roomId || 'global'}`);
    }
    
    console.log('Subscribed to WebSocket chat:', chatType, roomId);
    
    // Don't attempt to connect here - rely on the ChatContext to manage connection
    // The connection should already be established by the ChatContext
    
    // Cleanup
    return () => {
      // Unsubscribe from WebSocket
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
    };
  }, [roomId, currentUser, chatType]);

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Create temporary optimistic message
    const tempId = `temp-${Date.now()}`;
    const messageContent = newMessage.trim();
    const uniqueId = `msg-${tempId}-${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage = {
      id: tempId,
      uniqueId: uniqueId,
      content: messageContent,
      timestamp: new Date().toISOString(),
      sender: currentUser,
      roomId: roomId,
      fromCurrentUser: true,
      isOptimistic: true,
      optimisticContent: messageContent
    };
    
    // Store the optimistic message ID for cleanup later
    const optimisticMessageId = tempId;
    
    // Add optimistic message to local state
    setLocalMessages(prev => {
      const updatedMessages = [...prev, optimisticMessage];
      return updatedMessages.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
    });
    
    // Clear input field immediately for better UX
    setNewMessage('');
    
    try {
      // First try to send via context method which handles both API and WebSocket
      const response = await sendMessage(messageContent, roomId);
      
      // If we get a response with an ID
      if (response && response.id) {
        console.log(`Message sent successfully with ID: ${response.id}. Replacing optimistic message ${optimisticMessageId}`);
        
        // Add to seen set to prevent duplication
        messageSeenRef.current.add(response.id.toString());
        
        // CRITICAL: Force cleanup all optimistic messages with this content
        setLocalMessages(prev => {
          // Remove ALL optimistic messages with this content
          const withoutOptimistic = prev.filter(msg => 
            !(msg.isOptimistic && msg.optimisticContent === messageContent)
          );
          
          // Check if the confirmed message is already in the list
          const hasConfirmedMessage = withoutOptimistic.some(msg => 
            (msg.id && msg.id === response.id) || 
            (!msg.isOptimistic && msg.content === messageContent && 
            msg.sender?.id === currentUser?.id)
          );
          
          // If we already have the confirmed message, just return the filtered list
          if (hasConfirmedMessage) {
            return withoutOptimistic;
          }
          
          // Otherwise add the confirmed message to the list
          return [...withoutOptimistic, {
            ...response,
            fromCurrentUser: true,
            sender: response.sender || currentUser // Ensure sender is set
          }].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });
        });
      } 
      // If no response from context, try WebSocket directly as backup
      else if (ChatWebSocketService.isConnected()) {
        console.log('No response from context sendMessage, trying WebSocket directly');
        try {
          await ChatWebSocketService.sendMessage({
            roomId: roomId,
            content: messageContent
          });
          
          // Even without a response, let's remove the optimistic message after a delay
          // since the server should broadcast it back to us
          setTimeout(() => {
            setLocalMessages(prev => {
              // Check if the optimistic message is still there - use uniqueId for precise targeting
              const targetIndex = prev.findIndex(msg => 
                msg.isOptimistic && msg.uniqueId === uniqueId
              );
              
              if (targetIndex !== -1) {
                console.log('Cleaning up lingering optimistic message after WebSocket send');
                // Use slice to create a new array without the target message
                return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
              }
              return prev;
            });
          }, 5000); // 5 second timeout for server response
        } catch (wsError) {
          console.error('WebSocket send failed as backup:', wsError);
          throw wsError; // Re-throw to trigger error handling
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message on failure
      setLocalMessages(prev => 
        prev.filter(msg => msg.id !== optimisticMessageId)
      );
    }
  };

  const handleDeleteMessage = async (messageId, messageUniqueId) => {
    if (!messageId) return;
    
    // Normalize messageId to string for consistent comparisons
    const normalizedMessageId = messageId.toString();
    
    // Generate a transaction ID for this delete operation for deduplication
    const transactionId = `ui-delete-${normalizedMessageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Skip if we've already processed this message ID very recently
    const recentKey = `recent-delete-${normalizedMessageId}`;
    if (processedDeleteTransactionsRef.current.has(recentKey)) {
      console.log(`[ChatRoom] Skipping very recent delete request for message: ${normalizedMessageId}`);
      return;
    }
    
    // Look for any recent transactions for this message ID
    const recentDeletesForThisMessage = Array.from(processedDeleteTransactionsRef.current)
      .filter(tid => 
        tid.includes(`-${normalizedMessageId}-`) && // Contains the message ID
        (tid.startsWith('ui-delete-') || tid.startsWith('delete-')) && // Is a delete transaction 
        !tid.startsWith('recent-') // Not a "recent-delete" marker
      );
      
    if (recentDeletesForThisMessage.length > 0) {
      console.log(`[ChatRoom] Warning: Already processed ${recentDeletesForThisMessage.length} delete transactions for message ${normalizedMessageId} recently`);
      // We'll continue but with caution and logging
    }
    
    // Mark as recently processed to prevent rapid duplicate clicks
    processedDeleteTransactionsRef.current.add(recentKey);
    // Mark the actual transaction
    processedDeleteTransactionsRef.current.add(transactionId);
    
    console.log(`[ChatRoom] Attempting to delete message with ID: ${normalizedMessageId}, uniqueId: ${messageUniqueId || 'not provided'}, transactionId: ${transactionId}`);
    
    // Remove locally first for immediate feedback - now with a more specific filter
    setLocalMessages(prev => {
      // Find the exact message we want to delete
      const targetIndex = prev.findIndex(msg => 
        (msg.id && msg.id.toString() === normalizedMessageId) && 
        // If we have a unique ID, use it for more precise targeting
        (messageUniqueId ? msg.uniqueId === messageUniqueId : true)
      );
      
      if (targetIndex === -1) {
        // Message not found
        console.log(`[ChatRoom] Message with ID ${normalizedMessageId}${messageUniqueId ? `, uniqueId ${messageUniqueId}` : ''} not found in local state`);
        return prev;
      }
      
      console.log(`[ChatRoom] Removing message at index ${targetIndex} from local state`);
      // Create a new array without the target message
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
    
    // Remove from seen messages to allow it to be re-added if delete fails
    messageSeenRef.current.delete(normalizedMessageId);
    
    try {
      // Use the context method which handles both API and WebSocket
      console.log(`[ChatRoom] Calling deleteMessage in ChatContext with messageId: ${messageId}, roomId: ${roomId}, uniqueId: ${messageUniqueId || 'not provided'}, transactionId: ${transactionId}`);
      
      // Try both the context deleteMessage and the direct WebSocket deleteMessage for redundancy
      let success = false;
      let error = null;
      
      try {
        // First try context method - passing the transaction ID for deduplication
        success = await deleteMessage(messageId, roomId, messageUniqueId, transactionId);
      } catch (contextError) {
        console.warn(`[ChatRoom] Context deleteMessage failed: ${contextError.message}`);
        error = contextError;
        // We'll try WebSocket fallback next
      }
      
      // If the context method failed or we want additional redundancy
      if (!success || ChatWebSocketService.isConnected()) {
        try {
          console.log(`[ChatRoom] Sending ${success ? 'redundant' : 'fallback'} WebSocket delete for message ${messageId} in room ${roomId}, transactionId: ${transactionId}`);
          
          // Create a properly formatted delete message with explicit type field
          const deleteData = {
            messageId: messageId,
            roomId: roomId,
            uniqueId: messageUniqueId, // Pass the unique ID if available
            type: 'delete', // Explicitly mark as delete message for reliable processing
            chatType: chatType, // Pass the chat type to help with destination routing
            transactionId: transactionId // Include transaction ID for deduplication
          };
          
          // Send via WebSocket
          await ChatWebSocketService.deleteMessage(deleteData);
          success = true; // Mark as success if WebSocket send worked
          
          // Also manually trigger the notification for other tabs/instances
          ChatWebSocketService.notifyHandlers('onMessageDeleted', deleteData);
        } catch (wsError) {
          console.warn("WebSocket delete operation failed:", wsError);
          // Only throw if the context method also failed
          if (!success) {
            error = error || wsError;
            throw error;
          }
        }
      }
      
      if (!success && error) {
        throw error || new Error('Delete operation failed');
      }
      
      console.log(`Message ${messageId} successfully deleted`);
      
      // Force-check again after a delay to ensure message is gone
      setTimeout(() => {
        setLocalMessages(prev => {
          const targetIndex = prev.findIndex(msg => 
            msg.id && msg.id.toString() === messageId.toString() && 
            (messageUniqueId ? msg.uniqueId === messageUniqueId : true)
          );
            
          if (targetIndex !== -1) {
            console.log(`Removing lingering deleted message ${messageId} from local state`);
            return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
          }
          return prev;
        });
      }, 1000); // Increased timeout for more reliable cleanup
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
      
      // Restore the message if deletion failed and we have it cached
      const deletedMessage = contextMessages.find(msg => msg.id && msg.id.toString() === messageId.toString());
      if (deletedMessage) {
        setLocalMessages(prev => {
          if (!prev.some(msg => msg.id && msg.id.toString() === messageId.toString())) {
            // Make sure to mark as fromCurrentUser if it was the user's message
            const isFromCurrentUser = 
              deletedMessage.fromCurrentUser || 
              (deletedMessage.sender && currentUser && 
               deletedMessage.sender.id === currentUser.id);
            
            return [...prev, {
              ...deletedMessage,
              fromCurrentUser: isFromCurrentUser
            }].sort((a, b) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeA - timeB;
            });
          }
          return prev;
        });
      }
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Generate a unique key for each message to prevent React key duplication errors
  const getMessageKey = (message) => {
    // Create a random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    
    if (message.isOptimistic) {
      // For optimistic messages
      return `temp-${message.id || message.timestamp}-${randomSuffix}`;
    }
    
    // For confirmed messages with an ID
    if (message.id) {
      // Include ID, timestamp, and random suffix for guaranteed uniqueness
      const timestamp = message.timestamp ? new Date(message.timestamp).getTime() : Date.now();
      return `msg-${message.id}-${timestamp}-${randomSuffix}`;
    }
    
    // For messages without ID
    return `msg-unknown-${Date.now()}-${randomSuffix}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[600px]"
      >
        {localMessages.length === 0 && !loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('noMessagesYet', language) || 'No messages yet. Start the conversation!'}
          </div>
        ) : (
          localMessages.map((message) => {
            // Determine if this message is from the current user
            const isCurrentUserMessage = message.fromCurrentUser || 
              (message.sender && currentUser && message.sender.id === currentUser.id);
            
            return (
              <div 
                key={getMessageKey(message)}
                className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isCurrentUserMessage 
                      ? 'bg-purple-600 text-white' // Consistent purple for current user's messages
                      : 'bg-gray-200 dark:bg-[#3a3464] text-black dark:text-white' // Different style for other users' messages
                  }`}
                >
                  {!isCurrentUserMessage && (
                    <div className="font-bold text-sm">
                      {message.sender?.username || 'Unknown user'}
                    </div>
                  )}
                  <div className="break-words">{message.content}</div>
                  <div className="text-xs text-right mt-1 opacity-70 flex justify-between">
                    <span>
                      {message.isOptimistic && '✓ Sending...'}
                    </span>
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                  
                  {/* Delete button for own messages - only for confirmed messages */}
                  {isCurrentUserMessage && !message.isOptimistic && (
                    <button 
                      onClick={() => handleDeleteMessage(message.id, message.uniqueId)}
                      className="text-xs mt-1 opacity-50 hover:opacity-100"
                      title={t('deleteMessage', language) || 'Delete message'}
                    >
                      ✕ Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 text-sm">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 font-bold"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="mt-4 flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('typeYourMessage', language) || "Type your message..."}
          className="flex-1 rounded-l-lg border border-gray-300 dark:border-gray-700 p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[#3a3464] text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-r-lg px-4 py-2 disabled:opacity-50"
        >
          {t('send', language) || "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;
