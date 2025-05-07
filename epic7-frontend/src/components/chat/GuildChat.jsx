import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatInterface from './ChatInterface';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { fetchUserProfile } from '../../services/userService';
import { guildService } from '../../services/guildService';

/**
 * GuildChat component - Allows guild members to chat with each other
 */
const GuildChat = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useSettings();
  const { messages, loading, error, switchRoom, sendMessage, deleteMessage, loadGuildChat } = useChat();
  const [currentUser, setCurrentUser] = useState(null);
  const [guild, setGuild] = useState(null);
  const [guildChatRoom, setGuildChatRoom] = useState(null);
  const [loadingGuild, setLoadingGuild] = useState(true);
  const [guildError, setGuildError] = useState(null);

  // Load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserProfile();
        setCurrentUser(userData);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadUser();
  }, []);

  // Load guild and guild chat
  useEffect(() => {
    const loadGuildData = async () => {
      if (!guildId) {
        setGuildError(t('guildIdRequired', language));
        setLoadingGuild(false);
        return;
      }

      try {
        setLoadingGuild(true);
        
        // Load guild details
        const guildData = await guildService.getGuildById(guildId);
        setGuild(guildData);
        
        // Load guild chat room
        const chatRoom = await loadGuildChat(guildId);
        setGuildChatRoom(chatRoom);
        
        // Set active room to load messages
        if (chatRoom) {
          switchRoom(chatRoom);
        }
        
        setLoadingGuild(false);
      } catch (err) {
        console.error('Failed to load guild data:', err);
        setGuildError(t('failedToLoadGuild', language));
        setLoadingGuild(false);
      }
    };

    loadGuildData();
  }, [guildId, loadGuildChat, switchRoom, t, language]);

  // Handle send message
  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(messageId);
  };

  // Return to guild page
  const handleBack = () => {
    navigate(`/guilds/${guildId}`);
  };

  // Return to guilds list
  const handleBackToGuilds = () => {
    navigate('/guilds');
  };

  if (guildError || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-500">{t('error', language)}</h2>
          <p>{guildError || error}</p>
          <button 
            onClick={handleBackToGuilds}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaArrowLeft /> {t('backToGuilds', language)}
          </button>
        </div>
      </div>
    );
  }

  if (loadingGuild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
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
          <FaArrowLeft /> {t('backToGuild', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaUsers className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">{guild?.name} - {t('guildChat', language)}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center">{t('chatWithGuildMembers', language)}</p>
        </header>

        {/* Guild Info */}
        <div className="mb-6 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{guild?.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('guildMembers', language)}: {guild?.members?.length || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('guildLevel', language)}: {guild?.level || 1}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl">
          <ChatInterface 
            messages={messages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={currentUser}
            loading={loading}
            roomName={guild?.name || t('guildChat', language)}
            chatType="GUILD"
            canDelete={true}
          />
        </div>

        {/* Guild Rules */}
        {guild?.rules && (
          <div className="mt-6 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4">
            <h3 className="font-bold mb-2">{t('guildRules', language)}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {guild.rules}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuildChat;