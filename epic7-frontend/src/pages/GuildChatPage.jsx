import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { fetchGuildById } from '../services/guildService';
import ChatRoomWrapper from '../components/chat/ChatRoomWrapper';
// Update import to be more explicit
import GuildChatWebSocketHandler from '../components/chat/GuildChatWebSocketHandler.jsx';

/**
 * GuildChatPage - Page component for guild chat
 */
const GuildChatPage = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useSettings();
  const { fetchChatRoomByGuildId, loading, error: contextError } = useChat();
  const [guildInfo, setGuildInfo] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [guildMessages, setGuildMessages] = useState([]);

  // Handle direct WebSocket messages
  const handleWebSocketMessage = (message) => {
    console.log(`[GuildChatPage] Received direct WebSocket message:`, message);
    if (!message) return;
    
    // Skip if we've already seen this message
    const messageId = message.id || message.messageId;
    if (messageId && guildMessages.some(m => m.id === messageId)) {
      console.log(`[GuildChatPage] Skipping duplicate message: ${messageId}`);
      return;
    }
    
    // Add the message to our local state
    if (message.content) {
      setGuildMessages(prev => [...prev, message]);
    }
  };

  // Fetch guild info and chat room on component mount
  useEffect(() => {
    const loadGuildAndChatRoom = async () => {
      if (!guildId) {
        setErrorMessage('Guild ID is missing');
        setLoadingState(false);
        return;
      }

      setLoadingState(true);
      setErrorMessage(null);

      try {
        // Fetch guild information
        const guild = await fetchGuildById(guildId);
        setGuildInfo(guild);
        console.log('Guild info loaded:', guild);
        
        // Fetch chat room for this guild
        console.log('Fetching chat room for guild ID:', guildId);
        const room = await fetchChatRoomByGuildId(guildId);
        console.log('Chat room response:', room);
        
        if (!room) {
          console.error('No chat room data received from API');
          setErrorMessage('Failed to load chat room data');
        } else if (!room.id) {
          console.error('Chat room missing ID property:', room);
          setErrorMessage('Invalid chat room data (missing ID)');
        } else {
          console.log('Setting chat room with data:', room);
          setChatRoom(room);
        }
      } catch (err) {
        console.error('Error loading guild chat:', err);
        setErrorMessage(err.message || 'Failed to load guild chat');
      } finally {
        setLoadingState(false);
      }
    };

    loadGuildAndChatRoom();
  }, [guildId, fetchChatRoomByGuildId]);

  // Handle back navigation to guild page
  const handleBack = () => {
    navigate('/guilds');
  };

  // Handle errors
  const displayError = errorMessage || contextError;
  if (displayError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-500">{t('error', language) || 'Error'}</h2>
          <p>{displayError}</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToGuilds', language) || 'Back to Guilds'}
          </button>
        </div>
      </div>
    );
  }

  // Display loading state
  if (loadingState || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6 text-center">
          <div className="animate-pulse text-xl">
            {t('loadingGuildChat', language) || 'Loading guild chat...'}
          </div>
        </div>
      </div>
    );
  }

  // If no chat room is found
  if (!chatRoom) {
    console.error('No chat room available for guild:', guildId);
    console.error('Loading state:', loadingState, 'Loading from context:', loading);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-amber-500">{t('noChatRoom', language) || 'No Chat Room'}</h2>
          <p>{t('noChatRoomForGuild', language) || 'This guild does not have a chat room yet.'}</p>
          <div className="flex mt-4">
            <button 
              onClick={() => {
                // Force refresh to try again
                if (guildId) {
                  console.log('Manually retrying to fetch chat room for guild:', guildId);
                  setLoadingState(true);
                  fetchChatRoomByGuildId(guildId)
                    .then(room => {
                      console.log('Retry result:', room);
                      if (room) setChatRoom(room);
                      setLoadingState(false);
                    })
                    .catch(err => {
                      console.error('Retry error:', err);
                      setLoadingState(false);
                    });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mr-4"
            >
              Retry
            </button>
            <button 
              onClick={handleBack}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaArrowLeft /> {t('backToGuilds', language) || 'Back to Guilds'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <button 
          onClick={handleBack}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaArrowLeft /> {t('backToGuilds', language) || 'Back to Guilds'}
        </button>

        {/* Page Header */}
        <header className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaUsers className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">
              {guildInfo?.name || t('guildChat', language) || 'Guild Chat'}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('chatWithGuildMembers', language) || 'Chat with your guild members'}
          </p>
        </header>

        {/* Debug information */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            <p>Chat Room ID: {chatRoom?.id}</p>
            <p>Chat Room Type: {chatRoom?.type}</p>
          </div>
        )}

        {/* WebSocket handler for guild chat messages */}
        <GuildChatWebSocketHandler 
          guildId={guildId} 
          onMessage={handleWebSocketMessage} 
          onDeleteMessage={(deleteEvent) => {
            console.log(`[GuildChatPage] Received delete event:`, deleteEvent);
            const messageId = deleteEvent.messageId || deleteEvent.id;
            if (messageId) {
              setGuildMessages(prev => prev.filter(m => m.id !== messageId));
            }
          }}
        />

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4">
          <ChatRoomWrapper 
            roomId={chatRoom.id}
            roomName={guildInfo?.name || t('guildChat', language) || 'Guild Chat'}
            chatType="GUILD"
            onBack={handleBack}
          />
        </div>

        {/* Guild Chat Info */}
        <div className="mt-6 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('guildChatInfo', language) || 'Use this chat to coordinate with your guild members and plan strategies.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuildChatPage;