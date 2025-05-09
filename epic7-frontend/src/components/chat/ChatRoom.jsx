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
      
      // Skip if we've already seen this message
      if (data.id && messageSeenRef.current.has(data.id.toString())) {
        console.log('Skipping already seen message:', data.id);
        return;
      }
      
      // Check if message belongs to this room
      if (data.roomId && data.roomId.toString() !== roomId.toString()) {
        console.log(`Message for room ${data.roomId}, but we're in ${roomId}`);
        return;
      }
      
      // Is message from current user?
      const isFromCurrentUser = data.sender && 
        currentUser && data.sender.id === currentUser.id;

      // STRICT DUPLICATE DETECTION
      // Check for any similar messages already in the state before adding
      let isDuplicate = false;
      
      setLocalMessages(prevMessages => {
        // First look for optimistic messages to replace
        if (isFromCurrentUser) {
          // Try to find an optimistic message from the same user with same content
          const optimisticIndex = prevMessages.findIndex(m => 
            m.isOptimistic && 
            m.content === data.content &&
            m.sender?.id === data.sender?.id
          );
          
          if (optimisticIndex !== -1) {
            // Replace optimistic with confirmed message and return
            const newMessages = [...prevMessages];
            newMessages[optimisticIndex] = {
              ...data,
              fromCurrentUser: true
            };
            
            // Add to seen set to avoid future duplicates
            if (data.id) messageSeenRef.current.add(data.id.toString());
            
            return newMessages;
          }
        }
        
        // Next, check for any near-duplicate messages
        isDuplicate = prevMessages.some(m => {
          // Perfect ID match
          if (m.id === data.id) return true;
          
          // Same content, same sender, and timestamp within 3 seconds
          if (m.content === data.content && 
              m.sender?.id === data.sender?.id && 
              Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 3000) {
            return true;
          }
          
          return false;
        });
        
        if (isDuplicate) {
          console.log('Duplicate message detected and skipped:', data);
          return prevMessages;
        }
        
        // Add to seen set to avoid future duplicates
        if (data.id) messageSeenRef.current.add(data.id.toString());
        
        // If it passes all checks, add the message
        const newMessage = {
          ...data,
          fromCurrentUser: isFromCurrentUser,
          roomId: data.roomId || roomId
        };
        
        // Add and sort chronologically
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
    const optimisticMessage = {
      id: tempId,
      content: newMessage,
      timestamp: new Date().toISOString(),
      sender: currentUser,
      roomId: roomId,
      fromCurrentUser: true,
      isOptimistic: true
    };
    
    // Add optimistic message to local state
    setLocalMessages(prev => {
      const updatedMessages = [...prev, optimisticMessage];
      return updatedMessages.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
    });
    
    // Store message content before clearing input
    const messageContent = newMessage;
    
    // Clear input field immediately for better UX
    setNewMessage('');
    
    try {
      // First try to send via context method which handles both API and WebSocket
      const response = await sendMessage(messageContent);
      
      // If we get a response with an ID, update the optimistic message
      if (response && response.id) {
        // Add to seen set to prevent duplication
        messageSeenRef.current.add(response.id.toString());
        
        setLocalMessages(prev => 
          prev.map(msg => msg.id === tempId ? {
            ...response,
            fromCurrentUser: true
          } : msg)
        );
      } 
      // If no response from sendMessage, try WebSocket directly as backup
      else if (ChatWebSocketService.isConnected()) {
        try {
          await ChatWebSocketService.sendMessage({
            roomId: roomId,
            content: messageContent
          });
        } catch (wsError) {
          console.error('WebSocket send failed as backup, message may be stuck:', wsError);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message on failure
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId) => {
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
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
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
                key={message.id || `temp-${message.timestamp}`}
                className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isCurrentUserMessage 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 dark:bg-[#3a3464] text-black dark:text-white'
                  } ${message.isOptimistic ? 'opacity-70' : ''}`}
                >
                  {!isCurrentUserMessage && (
                    <div className="font-bold text-sm">
                      {message.sender?.username || 'Unknown user'}
                    </div>
                  )}
                  <div className="break-words">{message.content}</div>
                  <div className="text-xs text-right mt-1 opacity-70">
                    {formatTime(message.timestamp)}
                    {message.isOptimistic && ' (sending...)'}
                  </div>
                  
                  {/* Delete button for own messages */}
                  {isCurrentUserMessage && !message.isOptimistic && (
                    <button 
                      onClick={() => handleDeleteMessage(message.id)}
                      className="ml-2 text-xs opacity-50 hover:opacity-100"
                      title={t('deleteMessage', language) || 'Delete message'}
                    >
                      ✕
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