import React, { useState, useEffect, useRef, memo } from 'react';
import { FaTrash, FaPaperPlane, FaSmile, FaCircle } from 'react-icons/fa';
import { useSettings } from '../../context/SettingsContext';
import Emoji from 'emoji-picker-react';
import ChatWebSocketService from '../../services/ChatWebSocketService';

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, currentUser, canDelete, onDeleteMessage, formatTimestamp, t, language }) => {
  // Check if this message is from the current user
  const isCurrentUser = message.fromCurrentUser ||
    (currentUser && message.sender && message.sender.id === currentUser.id);
  
  // Determine sender name
  const sender = message.sender || { id: -1, username: 'Unknown' };
  
  // Check if user can delete this message
  const canDeleteThisMessage = canDelete && currentUser && message.sender && 
    message.sender.id === currentUser.id;
  
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-lg p-3 ${
        isCurrentUser 
          ? 'bg-purple-100 dark:bg-purple-900 ml-auto' 
          : 'bg-white dark:bg-gray-700'
      }`}>
        <div className="flex justify-between items-start mb-1">
          <span className={`font-semibold text-sm ${
            isCurrentUser
              ? 'text-purple-700 dark:text-purple-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {sender.username}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(message.timestamp)}
            </span>
            {canDeleteThisMessage && (
              <button 
                onClick={() => onDeleteMessage(message.id, message.uniqueId)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                title={t('deleteMessage', language)}
              >
                <FaTrash size={12} />
              </button>
            )}
          </div>
        </div>
        <p className={`whitespace-pre-wrap break-words ${
          isCurrentUser
            ? 'text-gray-800 dark:text-gray-200' 
            : 'text-gray-800 dark:text-gray-200'
        } ${message.isOptimistic ? 'opacity-70' : ''}`}>
          {message.content || (message.data && message.data.content)}
        </p>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

const ChatInterface = ({ 
  messages, 
  onSendMessage, 
  onDeleteMessage, 
  currentUser, 
  loading, 
  roomName, 
  chatType, 
  canDelete = false 
}) => {
  const { language, t } = useSettings();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [sortedMessages, setSortedMessages] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connected', 'disconnected', 'connecting'
  
  // Sort messages when they arrive
  useEffect(() => {
    if (!messages || !Array.isArray(messages)) {
      setSortedMessages([]);
      return;
    }
    
    // Sort messages chronologically (oldest first, newest last)
    const sorted = [...messages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
    
    setSortedMessages(sorted);
    
    // Check if new messages were added
    if (messages.length > lastMessageCountRef.current) {
      // Check if we should auto-scroll based on user position
      const shouldScroll = shouldScrollToBottom || checkShouldScrollToBottom();
      
      if (shouldScroll) {
        setTimeout(() => scrollToBottom(), 100);
      }
    }
    
    // Update ref to current message count
    lastMessageCountRef.current = messages.length;
  }, [messages, shouldScrollToBottom]);
  
  // Check if user was near bottom before new messages
  const checkShouldScrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    // Calculate how close to the bottom the user is
    const scrollPosition = container.scrollHeight - container.scrollTop - container.clientHeight;
    // If they're within 200px of the bottom, auto-scroll
    return scrollPosition < 200;
  };

  // Handle scrolling when messages update
  useEffect(() => {
    if (sortedMessages.length > 0 && shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [sortedMessages, shouldScrollToBottom]);

  // Handle outside click for emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle scroll events to track user scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // If user manually scrolls up, stop auto-scrolling
      if (container.scrollHeight - container.scrollTop - container.clientHeight > 100) {
        setShouldScrollToBottom(false);
      } else {
        // If they scroll back to bottom, enable auto-scroll again
        setShouldScrollToBottom(true);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Monitor WebSocket connection status
  useEffect(() => {
    const checkConnectionStatus = () => {
      const isConnected = ChatWebSocketService.isConnected();
      setWsStatus(isConnected ? 'connected' : 'disconnected');
    };

    // Initial check
    checkConnectionStatus();
    
    // Check periodically
    const intervalId = setInterval(checkConnectionStatus, 5000);
    
    // Set up connection status handlers
    const onOpenHandler = ChatWebSocketService.addHandler('onOpen', () => {
      console.log('ChatInterface detected WebSocket connection open');
      setWsStatus('connected');
    });
    
    const onCloseHandler = ChatWebSocketService.addHandler('onClose', () => {
      console.log('ChatInterface detected WebSocket connection closed');
      setWsStatus('disconnected');
    });
    
    const onErrorHandler = ChatWebSocketService.addHandler('onError', () => {
      console.log('ChatInterface detected WebSocket error');
      setWsStatus('disconnected');
    });

    return () => {
      clearInterval(intervalId);
      ChatWebSocketService.removeHandler(onOpenHandler);
      ChatWebSocketService.removeHandler(onCloseHandler);
      ChatWebSocketService.removeHandler(onErrorHandler);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      // Force scroll to bottom when user sends a message
      setShouldScrollToBottom(true);
      // Focus back on input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    const cursor = inputRef.current.selectionStart;
    const text = message.slice(0, cursor) + emojiObject.emoji + message.slice(cursor);
    setMessage(text);
    setShowEmojiPicker(false);
    // Focus back on input after emoji selection
    setTimeout(() => {
      inputRef.current.focus();
      inputRef.current.selectionStart = cursor + emojiObject.emoji.length;
      inputRef.current.selectionEnd = cursor + emojiObject.emoji.length;
    }, 10);
  };

  // Safely parse and format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      // Handle string timestamps
      const date = typeof timestamp === 'string' 
        ? new Date(timestamp) 
        : timestamp instanceof Date 
          ? timestamp 
          : new Date();
          
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return '';
      }
      
      return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return '';
    }
  };

  // Render message list
  const renderMessages = () => {
    if (!Array.isArray(sortedMessages)) {
      return (
        <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
          {t('errorLoadingMessages', language)}
        </div>
      );
    }

    if (sortedMessages.length === 0) {
      return (
        <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
          {t('noMessages', language)}
        </div>
      );
    }
    
    return (
      <>
        {sortedMessages.map((msg, index) => (
          <ChatMessage 
            key={msg.id || `msg-${index}`}
            message={msg}
            currentUser={currentUser}
            canDelete={canDelete}
            onDeleteMessage={onDeleteMessage}
            formatTimestamp={formatTimestamp}
            t={t}
            language={language}
          />
        ))}
        <div ref={messagesEndRef} />
      </>
    );
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="bg-purple-600 dark:bg-purple-800 text-white p-4 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">{roomName || t('chatRoom', language)}</h3>
          <p className="text-sm opacity-80">{chatType === 'GUILD' ? t('guildChat', language) : t('globalChat', language)}</p>
        </div>
        <div className="flex items-center text-xs">
          <FaCircle 
            className={`mr-2 ${
              wsStatus === 'connected' ? 'text-green-400' : 
              wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
            }`} 
            size={10} 
          />
          {wsStatus === 'connected' ? t('wsConnected', language) || 'Connected' : 
           wsStatus === 'connecting' ? t('wsConnecting', language) || 'Connecting...' : 
           t('wsDisconnected', language) || 'Disconnected'}
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 flex flex-col space-y-4"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
          </div>
        ) : renderMessages()}
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('typeMessage', language)}
              className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loading}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400"
              >
                <FaSmile />
              </button>
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="absolute bottom-12 right-0 z-10"
                >
                  <Emoji onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className={`p-3 rounded-lg text-white ${
              !message.trim() || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;