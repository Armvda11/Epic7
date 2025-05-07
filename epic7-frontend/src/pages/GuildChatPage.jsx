import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import ChatInterface from '../components/chat/ChatInterface';
import { fetchGuildChatRoom } from '../services/ChatServices';
import { fetchUserGuild } from '../services/guildService';

const GuildChatPage = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { language, t } = useSettings();
  const { 
    messages, 
    currentUser, 
    loading, 
    error,
    switchRoom, 
    sendMessage, 
    deleteMessage 
  } = useChat();
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [guild, setGuild] = useState(null);

  useEffect(() => {
    const loadGuildChat = async () => {
      if (!guildId) {
        setLocalError("Guild ID is missing");
        setLocalLoading(false);
        return;
      }

      try {
        setLocalLoading(true);
        setLocalError(null);
        
        // First fetch guild info to verify the user is a member
        const guildInfo = await fetchUserGuild();
        
        if (!guildInfo || guildInfo.id !== parseInt(guildId)) {
          throw new Error('You are not a member of this guild');
        }
        
        setGuild(guildInfo);
        
        // Fetch the guild chat room
        const guildRoom = await fetchGuildChatRoom(guildId);
        if (!guildRoom) {
          throw new Error('Failed to load guild chat room');
        }
        
        // Switch to the guild chat room in context
        await switchRoom(guildRoom);
      } catch (err) {
        console.error('Error loading guild chat:', err);
        setLocalError(err.message || 'Failed to load guild chat');
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadGuildChat();
    
    // Clean up function
    return () => {
      // Any cleanup needed when component unmounts
    };
  }, [guildId, switchRoom]);

  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(messageId);
  };

  const handleBackClick = () => {
    navigate('/guilds');
  };

  if (localLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6 flex justify-center items-center">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (localError || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-4xl mx-auto bg-red-100 dark:bg-red-900 rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">
            {t('error', language)}
          </h2>
          <p className="text-red-600 dark:text-red-200">{localError || error}</p>
          <button
            onClick={handleBackClick}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            {t('returnToGuilds', language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaArrowLeft /> {t('backToGuilds', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaUsers className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">{guild?.name || t('guildChat', language)}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            {t('chatWithGuildMembers', language)}
          </p>
        </header>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4 mb-8">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={currentUser}
            loading={loading}
            roomName={guild?.name}
            chatType="GUILD"
            canDelete={true}
          />
        </div>
      </div>
    </div>
  );
};

export default GuildChatPage;