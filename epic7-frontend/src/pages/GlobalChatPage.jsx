import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';
import ChatRoom from '../components/chat/ChatRoom';

/**
 * GlobalChatPage - Page component for the global game chat
 */
const GlobalChatPage = () => {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { globalChatRoom, error, fetchGlobalChatRoom } = useChat();

  // Fetch the global chat room on component mount
  useEffect(() => {
    fetchGlobalChatRoom();
  }, [fetchGlobalChatRoom]);

  // Handle back navigation
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
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4">
          {globalChatRoom ? (
            <ChatRoom 
              roomId={globalChatRoom.id}
              roomName={globalChatRoom.name || t('globalChat', language)}
              chatType="GLOBAL"
              onBack={handleBack}
            />
          ) : (
            <div className="text-center py-10">
              <div className="animate-pulse">
                {t('loadingChat', language) || 'Loading chat...'}
              </div>
            </div>
          )}
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

export default GlobalChatPage;