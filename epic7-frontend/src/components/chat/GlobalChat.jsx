import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import ChatInterface from './ChatInterface';
import { FaArrowLeft } from 'react-icons/fa';
import { fetchUserProfile } from '../../services/userService';
import { useState } from 'react';

/**
 * GlobalChat component - Allows players to chat in the global game chat
 */
const GlobalChat = () => {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { globalChatRoom, messages, loading, error, switchRoom, sendMessage, deleteMessage } = useChat();
  const [currentUser, setCurrentUser] = useState(null);

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

  // Set global chat as active when component mounts
  useEffect(() => {
    if (globalChatRoom) {
      switchRoom(globalChatRoom);
    }
  }, [globalChatRoom, switchRoom]);

  // Handle send message
  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
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
            messages={messages}
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