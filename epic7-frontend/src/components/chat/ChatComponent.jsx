import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaTrashAlt } from 'react-icons/fa';
import { useChatContext } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import useWebSocketReconnect from '../../hooks/useWebSocketReconnect';
import { formatChatErrorMessage } from '../../services/chatErrorUtils';

const ChatComponent = ({ roomType, guildId = null }) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { 
    messages, 
    typingUsers, 
    user, 
    loading, 
    error, 
    joinRoom, 
    leaveRoom, 
    sendMessage, 
    deleteMessage,
    setTyping 
  } = useChatContext();
  const { t, language } = useSettings();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Use our WebSocket reconnection hook
  const { isReconnecting, wasReconnected } = useWebSocketReconnect({
    onReconnect: () => {
      console.log('Chat reconnected, rejoining room:', roomType, guildId);
      joinRoom(roomType, guildId).catch(err => 
        console.error('Failed to rejoin room after reconnection:', err)
      );
    }
  });

// Join chat room on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        await joinRoom(roomType, guildId);
      } catch (error) {
        console.error('Failed to join chat room:', error);
        // We don't need to handle this error specifically here
        // as the ChatContext will set the error state
      }
    };

    // Initialize the chat when the component mounts (if not reconnecting)
    if (!isReconnecting) {
      initChat();
    }

    // Leave chat room when component unmounts
    return () => {
      leaveRoom();
    };
  }, [joinRoom, leaveRoom, roomType, guildId, isReconnecting]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing status
  useEffect(() => {
    if (isTyping) {
      setTyping(true);
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set a new timeout to stop typing status after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, setTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    // If user wasn't already typing, set typing state to true
    if (!isTyping && e.target.value.trim().length > 0) {
      setIsTyping(true);
    }
    
    // If user clears the input, set typing state to false
    if (e.target.value.trim().length === 0) {
      setIsTyping(false);
      setTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (messageInput.trim()) {
      try {
        await sendMessage(messageInput.trim());
        setMessageInput('');
        setIsTyping(false);
        setTyping(false);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Helper function to format messages by date groups
  const formatMessages = () => {
    if (!messages || !messages.length) return [];
    
    // Make sure we're working with valid message objects
    const validMessages = messages.filter(message => 
      message && 
      (typeof message.content === 'string') && 
      (message.timestamp || message.id)
    );
    
    if (validMessages.length === 0) return [];
    
    // Group messages by date
    const groupedMessages = validMessages.reduce((groups, message) => {
      // Safely handle invalid dates
      let dateString;
      try {
        // Check if timestamp is valid
        if (!message.timestamp || isNaN(new Date(message.timestamp).getTime())) {
          dateString = 'Unknown Date';
        } else {
          const date = new Date(message.timestamp);
          dateString = date.toLocaleDateString();
        }
      } catch (e) {
        console.warn('Invalid date format:', message.timestamp);
        dateString = 'Unknown Date';
      }
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
      return groups;
    }, {});
    
    // Convert groups to array format for rendering
    return Object.keys(groupedMessages).map(date => ({
      date,
      messages: groupedMessages[date]
    }));
  };

  // Check if a message is from the current user
  const isOwnMessage = (message) => {
    if (!message || !user) return false;
    
    // Handle different message formats
    // If sender is a string (backend format)
    if (typeof message.sender === 'string') {
      // Compare with user email or username
      return message.sender === user.email || message.sender === user.username;
    }
    
    // If sender is an object (frontend expected format)
    if (message.sender && typeof message.sender === 'object') {
      return message.sender.id === user.id;
    }
    
    return false;
  };

  // Check if chat is ready
  const isChatReady = !loading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    // Format the error message
    const formattedError = formatChatErrorMessage(error, language);
    const isServerError = formattedError.includes('server') || 
                         formattedError.includes('session') || 
                         formattedError.includes('collection');
    
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg text-red-700 dark:text-red-300 max-w-md">
          <p className="text-center font-medium mb-3">{t("chatError", language) || "Chat Error"}</p>
          <p>{formattedError}</p>
          
          {/* Retry button for server errors */}
          {isServerError && !isReconnecting && (
            <button 
              onClick={() => joinRoom(roomType, guildId)} 
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded w-full transition-colors"
            >
              {t("retryConnection", language) || "Retry Connection"}
            </button>
          )}
          
          {/* Show reconnecting spinner */}
          {isReconnecting && (
            <div className="flex justify-center mt-4">
              <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-purple-700 dark:text-purple-400">{t("reconnecting", language) || "Reconnecting..."}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Reconnection notification */}
      {isReconnecting && (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 text-yellow-800 dark:text-yellow-200 text-center text-sm">
          {t("reconnecting", language)}
        </div>
      )}
      
      {wasReconnected && (
        <div className="bg-green-100 dark:bg-green-900 p-2 text-green-800 dark:text-green-200 text-center text-sm animate-pulse">
          {t("connectionRestored", language) || "Connection restored"}
        </div>
      )}
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {formatMessages().map((group, groupIndex) => (
          <div key={`group-${group.date}-${groupIndex}`} className="space-y-2">
            {/* Date separator */}
            <div className="text-center">
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                {group.date === 'Unknown Date' ? 
                  t("unknownDate", language) || "Unknown Date" : 
                  (() => {
                    try {
                      return new Date(group.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    } catch (e) {
                      return group.date;
                    }
                  })()
                }
              </span>
            </div>
            
            {/* Messages in this date group */}
            {group.messages.map((message, messageIndex) => (
              <div 
                key={message.id ? `msg-${message.id}` : `msg-${group.date}-${messageIndex}`} 
                className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwnMessage(message)
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none'
                  }`}
                >
                  {/* Message sender name (not shown for own messages) */}
                  {!isOwnMessage(message) && (
                    <div className="font-bold text-sm text-purple-700 dark:text-purple-400">
                      {typeof message.sender === 'string' 
                        ? message.sender 
                        : message.sender?.username || t("unknownUser", language) || "Unknown"}
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="break-words">
                    {message.content}
                  </div>
                  
                  {/* Message timestamp */}
                  <div className="text-xs text-right mt-1 opacity-70">
                    {(() => {
                      try {
                        return message.timestamp && !isNaN(new Date(message.timestamp).getTime()) ?
                          new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                          t("unknownTime", language) || "Unknown time";
                      } catch (e) {
                        return t("unknownTime", language) || "Unknown time";
                      }
                    })()}
                    
                    {/* Delete button for own messages */}
                    {isOwnMessage(message) && (
                      <button 
                        onClick={() => handleDeleteMessage(message.id)}
                        className="ml-2 text-white opacity-70 hover:opacity-100"
                        title={t("deleteMessage", language)}
                      >
                        <FaTrashAlt size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0]} ${t("isTyping", language)}...`
              : `${typingUsers.length} ${t("peopleTyping", language)}...`}
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2f2b50]">
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder={t("typeMessage", language)}
            className="flex-1 p-3 bg-white dark:bg-[#3a3660] text-gray-900 dark:text-white border-none focus:outline-none"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="bg-purple-600 text-white px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
