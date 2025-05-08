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
  const handlerIdRef = useRef(null);
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
      
      // Track seen message IDs
      contextMessages.forEach(msg => {
        if (msg.id) messageSeenRef.current.add(msg.id.toString());
      });
      
      setLocalMessages(contextMessages);
    }
  }, [contextMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // Set up WebSocket handler for real-time messages
  useEffect(() => {
    if (!roomId || !currentUser) return;
    
    console.log(`Setting up WebSocket handler for room ${roomId}`);
    
    // Handler for new messages from WebSocket
    const handleNewMessage = (messageData) => {
      console.log('WebSocket message received:', messageData);
      
      if (!messageData) return;
      
      // Skip if we've already seen this message
      if (messageData.id && messageSeenRef.current.has(messageData.id.toString())) {
        console.log('Skipping already seen message:', messageData.id);
        return;
      }
      
      // Add to seen set to avoid duplicates
      if (messageData.id) messageSeenRef.current.add(messageData.id.toString());
      
      // Check if message belongs to this room
      if (messageData.roomId && messageData.roomId.toString() !== roomId.toString()) {
        console.log(`Message for room ${messageData.roomId}, but we're in ${roomId}`);
        return;
      }
      
      // Mark message from current user
      const isFromCurrentUser = messageData.sender && 
        messageData.sender.id === currentUser.id;
      
      const processedMessage = {
        ...messageData,
        fromCurrentUser: isFromCurrentUser,
        roomId: messageData.roomId || roomId
      };
      
      // Update state with the new message
      setLocalMessages(prevMessages => {
        // Check for duplicates
        const isDuplicate = prevMessages.some(m => m.id === processedMessage.id);
        if (isDuplicate) return prevMessages;
        
        return [...prevMessages, processedMessage];
      });
    };
    
    // Register message handler
    const handlerId = ChatWebSocketService.addHandler('onChatMessage', handleNewMessage);
    handlerIdRef.current = handlerId;
    
    // Connect WebSocket if not already connected to this room
    if (!ChatWebSocketService.isConnected() || ChatWebSocketService.roomId !== roomId) {
      ChatWebSocketService.connect(roomId);
    }
    
    // Cleanup
    return () => {
      if (handlerIdRef.current) {
        ChatWebSocketService.removeHandler(handlerIdRef.current);
      }
    };
  }, [roomId, currentUser]);

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
    setLocalMessages(prev => [...prev, optimisticMessage]);
    
    // Clear input field immediately for better UX
    setNewMessage('');
    
    try {
      // Send via WebSocket first for fastest delivery
      if (ChatWebSocketService.isConnected()) {
        ChatWebSocketService.sendMessage(newMessage, roomId);
      }
      
      // Also send via API for persistence
      const response = await sendMessage(newMessage);
      
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
      await deleteMessage(messageId);
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
          localMessages.map((message) => (
            <div 
              key={message.id || `temp-${message.timestamp}`}
              className={`flex ${message.fromCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.fromCurrentUser 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 dark:bg-[#3a3464] text-black dark:text-white'
                } ${message.isOptimistic ? 'opacity-70' : ''}`}
              >
                {!message.fromCurrentUser && (
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
                {message.fromCurrentUser && !message.isOptimistic && (
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
          ))
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