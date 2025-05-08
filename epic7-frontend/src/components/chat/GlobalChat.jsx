import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatInterface from './ChatInterface';
import { FaArrowLeft } from 'react-icons/fa';
import { fetchUserProfile } from '../../services/userService';
import { useState, useRef } from 'react';
import ChatWebSocketService from '../../services/ChatWebSocketService';

/**
 * GlobalChat component - Allows players to chat in the global game chat
 */
const GlobalChat = () => {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { globalChatRoom, messages, loading, error, switchRoom, sendMessage, deleteMessage } = useChat();
  const [currentUser, setCurrentUser] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  const handlerIdRef = useRef(null);
  const messageSeenRef = useRef(new Set()); // Track seen message IDs

  // Load user profile and store in localStorage for WebSocket service
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

  // Initialize with context messages
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
    }
  }, [messages]);

  // Initialize WebSocket connection for real-time messages
  useEffect(() => {
    if (!globalChatRoom || !globalChatRoom.id) return;
    
    console.log('Initializing WebSocket handler for global chat');
    
    // Create direct WebSocket handler for this component
    const handleNewMessage = (messageData) => {
      console.log('Global component received new message:', messageData);
      
      if (!messageData) return;
      
      // Skip if we've already seen this message
      if (messageData.id && messageSeenRef.current.has(messageData.id.toString())) {
        console.log('Skipping already seen message:', messageData.id);
        return;
      }
      
      // Add to seen set
      if (messageData.id) {
        messageSeenRef.current.add(messageData.id.toString());
      }
      
      // Add roomId to message if missing
      const message = {
        ...messageData,
        roomId: messageData.roomId || globalChatRoom.id
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
        
        // Otherwise check if message already exists to avoid duplicates
        const isDuplicate = prev.some(m => m.id === message.id);
        if (isDuplicate) return prev;
        
        // Add the new message
        return [...prev, message];
      });
    };
    
    // Register this component's message handler with the WebSocket service
    // Change to listen for both direct CHAT_MESSAGE events and events that come through onChatMessage
    const handlerId1 = ChatWebSocketService.addHandler('CHAT_MESSAGE', handleNewMessage);
    const handlerId2 = ChatWebSocketService.addHandler('onChatMessage', handleNewMessage);
    handlerIdRef.current = [handlerId1, handlerId2];
    
    console.log('Registered message handlers with IDs:', handlerIdRef.current);
    
    // Connect to room if not already connected
    if (!ChatWebSocketService.isConnected() || ChatWebSocketService.roomId !== globalChatRoom.id) {
      console.log('Connecting to global chat room:', globalChatRoom.id);
      ChatWebSocketService.connect(globalChatRoom.id);
    }
    
    // Cleanup function
    return () => {
      if (handlerIdRef.current) {
        console.log('Removing message handlers:', handlerIdRef.current);
        handlerIdRef.current.forEach(id => ChatWebSocketService.removeHandler(id));
      }
    };
  }, [globalChatRoom, currentUser]);

  // Set global chat as active when component mounts
  useEffect(() => {
    if (globalChatRoom) {
      switchRoom(globalChatRoom);
    }
  }, [globalChatRoom, switchRoom]);

  // Handle send message
  const handleSendMessage = async (content) => {
    // Create optimistic message
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      content: content,
      timestamp: new Date().toISOString(),
      roomId: globalChatRoom?.id,
      sender: currentUser,
      fromCurrentUser: true,
      isOptimistic: true
    };
    
    // Add optimistic message immediately
    setLocalMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket first for fastest delivery
    if (ChatWebSocketService.isConnected()) {
      ChatWebSocketService.sendMessage(content, globalChatRoom?.id);
    }
    
    // Also send via chat context for persistence
    const response = await sendMessage(content);
    
    // Replace optimistic message with real one if we got a response
    if (response && response.id) {
      // Add to seen set to prevent duplication
      messageSeenRef.current.add(response.id.toString());
      
      setLocalMessages(prev => prev.map(msg => 
        msg.id === optimisticId ? {
          ...response,
          fromCurrentUser: true
        } : msg
      ));
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    // Remove from seen set
    messageSeenRef.current.delete(messageId.toString());
    
    // Remove from local messages immediately
    setLocalMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    // Delete via chat context
    await deleteMessage(messageId);
  };

  // Return to dashboard
  const handleBack = () => {
    navigate('/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-500">{t('error', language)}</h2>
          <p>{error}</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToDashboard', language)}
          </button>
        </div>
      </div>
    );
  }

  // Use local messages for display
  const displayMessages = localMessages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button 
          onClick={handleBack}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaArrowLeft /> {t('backToDashboard', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{t('globalChat', language)}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('chatWithAllPlayers', language)}</p>
        </header>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl">
          <ChatInterface 
            messages={displayMessages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={currentUser}
            loading={loading}
            roomName={globalChatRoom?.name || t('globalChat', language)}
            chatType="GLOBAL"
            canDelete={true}
          />
        </div>

        {/* Chat Info */}
        <div className="mt-6 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('globalChatRules', language) || 'Be respectful to other players. Harassment, hate speech, or inappropriate content is not allowed.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalChat;