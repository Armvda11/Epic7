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
  const messageSeenRef = useRef(new Set()); // Track message IDs to avoid duplicates
  const messageContainerRef = useRef(null);

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
        
        // Mark messages from current user
        const isFromCurrentUser = currentUser && msg.sender && 
          msg.sender.id === currentUser.id;
        
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
      console.log('WebSocket message received:', data);
      
      // Handle delete messages
      if (data.type === 'delete' && data.messageId) {
        console.log('Message deleted notification received:', data.messageId);
        messageSeenRef.current.delete(data.messageId.toString());
        setLocalMessages(prev => prev.filter(msg => msg.id !== data.messageId));
        return;
      }
      
      // Skip if not a regular message
      if (!data || data.type) return;
      
      // Check if message belongs to this room
      if (data.roomId && data.roomId.toString() !== roomId.toString()) {
        console.log(`Message for room ${data.roomId}, but we're in ${roomId}`);
        return;
      }
      
      // Is message from current user?
      const isFromCurrentUser = 
        // Check if marked as fromCurrentUser by the service
        data.fromCurrentUser || 
        // Check sender ID
        (data.sender && currentUser && data.sender.id === currentUser.id) ||
        // Check senderId from our enhanced service
        (data.senderId && currentUser && data.senderId === currentUser.id);

      // For messages from current user - either replace the optimistic message
      // or ignore if we already have a non-optimistic version
      if (isFromCurrentUser) {
        // If we've already seen this message ID, ignore it
        if (data.id && messageSeenRef.current.has(data.id.toString())) {
          console.log('Ignoring already seen message from current user:', data.id);
          return;
        }
        
        // If it's a new message, add it to seen set
        if (data.id) {
          messageSeenRef.current.add(data.id.toString());
        }
        
        setLocalMessages(prevMessages => {
          // Check if we already have a non-optimistic version of this message
          const existingMessageIndex = prevMessages.findIndex(m => 
            !m.isOptimistic && 
            m.content === data.content && 
            m.sender?.id === data.sender?.id
          );
          
          if (existingMessageIndex !== -1) {
            console.log('Already have a non-optimistic version of this message, ignoring', data);
            return prevMessages;
          }
          
          // Look for a matching optimistic message to replace
          const optimisticIndex = prevMessages.findIndex(m => 
            m.isOptimistic && 
            m.content === data.content && 
            m.sender?.id === data.sender?.id
          );
          
          if (optimisticIndex !== -1) {
            console.log(`Replacing optimistic message at index ${optimisticIndex}:`, data);
            
            // Replace the optimistic message with the confirmed one
            const newMessages = [...prevMessages];
            newMessages[optimisticIndex] = {
              ...data,
              fromCurrentUser: true
            };
            
            return newMessages;
          }
          
          // If we don't have this message at all, add it
          console.log('Adding new message from current user:', data);
          const updatedMessages = [...prevMessages, {
            ...data,
            fromCurrentUser: true
          }];
          
          return updatedMessages.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });
        });
        
        return; // Skip rest of processing for current user's messages
      }
      
      // For messages from other users
      
      // Skip if we've already seen this message ID
      if (data.id && messageSeenRef.current.has(data.id.toString())) {
        console.log('Skipping already seen message:', data.id);
        return;
      }
      
      // Add to seen messages to avoid future duplicates
      if (data.id) {
        messageSeenRef.current.add(data.id.toString());
      }
      
      // Process message from other users
      setLocalMessages(prevMessages => {
        // Check if we already have this exact message (even without ID match)
        const isDuplicate = prevMessages.some(m => 
          // Perfect ID match if both have IDs
          (data.id && m.id && m.id === data.id) ||
          // Same content, same sender, and timestamp within 3 seconds
          (m.content === data.content && 
           m.sender?.id === data.sender?.id && 
           Math.abs(new Date(m.timestamp || 0) - new Date(data.timestamp || 0)) < 3000)
        );
        
        if (isDuplicate) {
          console.log('Duplicate message detected and skipped:', data);
          return prevMessages;
        }
        
        // Add the new message
        const newMessage = {
          ...data,
          fromCurrentUser: false,
          roomId: data.roomId || roomId
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
    if (chatType === 'GLOBAL') {
      subscription = ChatWebSocketService.subscribeToGlobalChat(handleMessage);
    } else if (chatType === 'GUILD' && roomId) {
      subscription = ChatWebSocketService.subscribeToGuildChat(roomId, handleMessage);
    } else if (chatType === 'FIGHT' || chatType === 'DUEL') {
      subscription = ChatWebSocketService.subscribeToDuelChat(roomId, handleMessage);
    }
    
    if (subscription) {
      subscriptionsRef.current.push(subscription);
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
    
    const optimisticMessage = {
      id: tempId,
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
              // Check if the optimistic message is still there
              const hasOptimistic = prev.some(msg => 
                msg.isOptimistic && msg.id === optimisticMessageId
              );
              
              if (hasOptimistic) {
                console.log('Cleaning up lingering optimistic message after WebSocket send');
                return prev.filter(msg => msg.id !== optimisticMessageId);
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

  // Handle deleting a message
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    
    console.log(`Attempting to delete message with ID: ${messageId}`);
    
    // Remove locally first for immediate feedback
    setLocalMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    // Remove from seen messages to allow it to be re-added if delete fails
    messageSeenRef.current.delete(messageId.toString());
    
    try {
      // Use the context method which handles both API and WebSocket
      const success = await deleteMessage(messageId);
      
      if (!success) {
        throw new Error('Delete operation failed');
      }
      
      // If the message was successfully deleted, let's make sure the WebSocket
      // service knows about it too, for additional safeguard
      if (ChatWebSocketService.isConnected() && currentRoom) {
        try {
          // Add to WebSocketService's deleted messages set to prevent re-adding
          await ChatWebSocketService.deleteMessage({
            messageId,
            roomId: currentRoom.id
          });
        } catch (wsError) {
          console.warn("Additional WebSocket delete notification failed:", wsError);
          // Not critical as the message was already deleted by the API
        }
      }
      
      console.log(`Message ${messageId} successfully deleted`);
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
      
      // Restore the message if deletion failed and we have it cached
      const deletedMessage = contextMessages.find(msg => msg.id === messageId);
      if (deletedMessage) {
        setLocalMessages(prev => {
          if (!prev.some(msg => msg.id === messageId)) {
            return [...prev, deletedMessage].sort((a, b) => {
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
                      ? message.isOptimistic
                        ? 'bg-purple-400 text-white' // Lighter color for optimistic messages
                        : 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-[#3a3464] text-black dark:text-white'
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
                      onClick={() => handleDeleteMessage(message.id)}
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