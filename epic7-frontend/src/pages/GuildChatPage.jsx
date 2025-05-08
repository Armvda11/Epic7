import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import { fetchGuildById } from '../services/guildService';
import ChatRoom from '../components/chat/ChatRoom';

/**
 * GuildChatPage - Page component for guild chat
 */
const GuildChatPage = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useSettings();
  const { fetchChatRoomByGuildId, loading, error } = useChat();
  const [guildInfo, setGuildInfo] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch guild info and chat room on component mount
  useEffect(() => {
    const loadGuildAndChatRoom = async () => {
      if (!guildId) {
        setErrorMessage('Guild ID is missing');
        setLoadingState(false);
        return;
      }

      try {
        // Fetch guild information
        const guild = await fetchGuildById(guildId);
        setGuildInfo(guild);
        
        // Fetch chat room for this guild
        const room = await fetchChatRoomByGuildId(guildId);
        setChatRoom(room);
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
  const displayError = errorMessage || error;
  if (displayError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-500">{t('error', language)}</h2>
          <p>{displayError}</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToGuilds', language)}
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-amber-500">{t('noChatRoom', language) || 'No Chat Room'}</h2>
          <p>{t('noChatRoomForGuild', language) || 'This guild does not have a chat room yet.'}</p>
          <button 
            onClick={handleBack}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToGuilds', language)}
          </button>
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
          <FaArrowLeft /> {t('backToGuilds', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaUsers className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">
              {guildInfo?.name || t('guildChat', language)}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('chatWithGuildMembers', language)}
          </p>
        </header>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4">
          <ChatRoom 
            roomId={chatRoom.id}
            roomName={guildInfo?.name || t('guildChat', language)}
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