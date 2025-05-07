import React, { useState, useEffect, useRef } from 'react';
import { FaTrash, FaPaperPlane, FaSmile } from 'react-icons/fa';
import { useSettings } from '../../context/SettingsContext';
import Emoji from 'emoji-picker-react';

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

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
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

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  const canDeleteMessage = (message) => {
    if (!canDelete) return false;
    if (!currentUser) return false;
    return message.sender.id === currentUser.id;
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="bg-purple-600 dark:bg-purple-800 text-white p-4">
        <h3 className="text-xl font-bold">{roomName || t('chatRoom', language)}</h3>
        <p className="text-sm opacity-80">{chatType === 'GUILD' ? t('guildChat', language) : t('globalChat', language)}</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-lg p-3 ${
                  msg.sender.id === currentUser?.id 
                    ? 'bg-purple-100 dark:bg-purple-900 ml-auto' 
                    : 'bg-white dark:bg-gray-700'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold text-sm ${
                      msg.sender.id === currentUser?.id
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {msg.sender.username}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                      {canDeleteMessage(msg) && (
                        <button 
                          onClick={() => onDeleteMessage(msg.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title={t('deleteMessage', language)}
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={`whitespace-pre-wrap break-words ${
                    msg.sender.id === currentUser?.id
                      ? 'text-gray-800 dark:text-gray-200' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
            {t('noMessages', language)}
          </div>
        )}
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