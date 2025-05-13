import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatRoom from './ChatRoom';
import ChatWebSocketService from '../../services/ChatWebSocketService';

/**
 * ChatRoomWrapper - A component that handles error cases and ensures
 * the ChatRoom has a valid room before rendering
 */
const ChatRoomWrapper = ({ roomId, roomName, chatType, onBack }) => {
  const { t, language } = useSettings();
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Ensure we have a WebSocket connection before rendering the chat room
  useEffect(() => {
    const ensureConnection = async () => {
      if (!roomId) return;
      
      setIsConnecting(true);
      try {
        if (!ChatWebSocketService.isConnected()) {
          console.log(`Connecting to WebSocket for ${chatType} chat room ${roomId}...`);
          await ChatWebSocketService.connect();
        }
      } catch (err) {
        console.error(`Error connecting to WebSocket for ${chatType} chat:`, err);
        setError(t('webSocketError', language) || 'Could not connect to chat server');
      } finally {
        setIsConnecting(false);
      }
    };

    ensureConnection();
  }, [roomId, chatType, t, language]);

  if (!roomId) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{t('invalidChatRoom', language) || 'Invalid chat room'}</p>
        <button 
          onClick={onBack}
          className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          {t('goBack', language) || 'Go Back'}
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-3"
        >
          {t('retry', language) || 'Retry'}
        </button>
        <button 
          onClick={onBack}
          className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          {t('goBack', language) || 'Go Back'}
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          {t('connectingToChat', language) || 'Connecting to chat...'}
        </div>
      </div>
    );
  }

  return (
    <ChatRoom
      roomId={roomId}
      roomName={roomName}
      chatType={chatType}
      onBack={onBack}
    />
  );
};

export default ChatRoomWrapper;
