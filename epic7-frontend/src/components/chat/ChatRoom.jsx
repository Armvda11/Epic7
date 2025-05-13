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
  const subscriptionsRef = useRef([]);
  const messageSeenRef = useRef(new Set());
  const processedDeleteTransactionsRef = useRef(new Set());
  const messageContainerRef = useRef(null);

  // Helper function to handle delete events
  const handleDeleteEvent = (data) => {
    const messageId = data.messageId || data.id;
    if (!messageId) {
      console.warn(`[ChatRoom] Delete event missing messageId: ${JSON.stringify(data)}`);
      return;
    }

    messageSeenRef.current.delete(messageId.toString());

    setLocalMessages(prev => {
      const targetIndex = prev.findIndex(msg => {
        const idMatch = msg.id && msg.id.toString() === messageId.toString();
        const uniqueIdMatch = !data.uniqueId || (msg.uniqueId && msg.uniqueId === data.uniqueId);
        return idMatch && uniqueIdMatch;
      });
      
      if (targetIndex === -1) return prev;
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
  };

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserProfile();
        setCurrentUser(userData);
        
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
      const processedMessages = contextMessages.map(msg => {
        if (msg.id) messageSeenRef.current.add(msg.id.toString());
        
        const isFromCurrentUser = 
          msg.fromCurrentUser || 
          (currentUser && msg.sender && msg.sender.id === currentUser.id) ||
          (currentUser && msg.senderId && msg.senderId === currentUser.id) ||
          (currentUser && msg.sender && currentUser.username && 
          msg.sender.username === currentUser.username);
        
        return {
          ...msg,
          fromCurrentUser: isFromCurrentUser
        };
      });
      
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
    
    // Handler for messages coming from WebSocket
    const handleMessage = (data) => {
      // Process delete messages
      if ((data.type === 'delete' || data.event === 'delete' || data.action === 'delete' || data.delete === true) && 
          (data.messageId || data.id)) {
        handleDeleteEvent({
          type: 'delete',
          messageId: data.messageId || data.id,
          roomId: data.roomId || roomId,
          uniqueId: data.uniqueId,
          sender: data.sender || data.username
        });
        return;
      }
      
      if (!data) return;
      
      if (data.type && data.type !== 'delete' && data.type !== 'message') return;
      
      if (data.roomId && data.roomId.toString() !== roomId.toString()) return;
      
      const isFromCurrentUser = 
        data.fromCurrentUser || 
        (data.sender && currentUser && data.sender.id === currentUser.id) ||
        (data.senderId && currentUser && data.senderId === currentUser.id) ||
        (data.sender && currentUser && data.sender.username === currentUser.username);
      
      if (data.id && messageSeenRef.current.has(data.id.toString())) return;
      
      if (data.id) {
        messageSeenRef.current.add(data.id.toString());
      }

      setLocalMessages(prevMessages => {
        // Check for duplicates
        const isDuplicate = prevMessages.some(m => 
          (data.id && m.id && m.id.toString() === data.id.toString()) ||
          (data.uniqueId && m.uniqueId && m.uniqueId === data.uniqueId) ||
          (m.content === data.content && 
            ((m.sender?.id && data.sender?.id && m.sender.id === data.sender.id) ||
             (m.sender?.username && data.sender?.username && m.sender.username === data.sender.username)) &&
             Math.abs(new Date(m.timestamp || 0) - new Date(data.timestamp || 0)) < 5000)
        );
        
        if (isDuplicate) return prevMessages;
        
        // Add the new message
        const newMessage = {
          ...data,
          fromCurrentUser: isFromCurrentUser,
          roomId: data.roomId || roomId,
          uniqueId: data.uniqueId || `msg-${data.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
    }
    
    // Cleanup
    return () => {
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
    
    // Clear input field immediately for better UX
    setNewMessage('');
    
    try {
      // Make sure parameters match the ChatContext sendMessage function signature:
      // sendMessage(content, roomId, user, chatType, transactionId)
      const response = await sendMessage(messageContent, roomId, currentUser, chatType);
      
      if (response && response.id) {
        messageSeenRef.current.add(response.id.toString());
        
        setLocalMessages(prev => {
          const withoutOptimistic = prev.filter(msg => 
            !(msg.isOptimistic && msg.uniqueId === uniqueId)
          );
          
          const hasConfirmedMessage = withoutOptimistic.some(msg => 
            msg.id && msg.id === response.id
          );
          
          if (hasConfirmedMessage) {
            return withoutOptimistic;
          }
          
          return [...withoutOptimistic, {
            ...response,
            fromCurrentUser: true,
            sender: response.sender || currentUser
          }].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });
        });
      } 
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message on failure
      setLocalMessages(prev => 
        prev.filter(msg => msg.uniqueId !== uniqueId)
      );
    }
  };

  const handleDeleteMessage = async (messageId, messageUniqueId) => {
    if (!messageId) return;
    
    const normalizedMessageId = messageId.toString();
    
    // Skip if we've already processed this recently
    const recentKey = `recent-delete-${normalizedMessageId}`;
    if (processedDeleteTransactionsRef.current.has(recentKey)) {
      return;
    }
    
    processedDeleteTransactionsRef.current.add(recentKey);
    
    // Remove locally first for immediate feedback
    setLocalMessages(prev => {
      const targetIndex = prev.findIndex(msg => 
        (msg.id && msg.id.toString() === normalizedMessageId) && 
        (messageUniqueId ? msg.uniqueId === messageUniqueId : true)
      );
      
      if (targetIndex === -1) return prev;
      
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
    
    messageSeenRef.current.delete(normalizedMessageId);
    
    try {
      await deleteMessage(messageId, roomId, messageUniqueId);
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message. Please try again.');
      
      // Restore the message if deletion failed and we have it cached
      const deletedMessage = contextMessages.find(msg => msg.id && msg.id.toString() === messageId.toString());
      if (deletedMessage) {
        setLocalMessages(prev => {
          if (!prev.some(msg => msg.id && msg.id.toString() === messageId.toString())) {
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
                key={`msg-${message.id || message.uniqueId || Date.now()}-${Math.random().toString(36).substr(2, 8)}`}
                className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isCurrentUserMessage 
                      ? 'bg-purple-600 text-white' 
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
