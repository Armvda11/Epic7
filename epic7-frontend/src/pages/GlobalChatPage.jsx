import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGlobe } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';
import ChatInterface from '../components/chat/ChatInterface';
import { fetchGlobalChatRoom } from '../services/ChatServices';
import { getToken } from '../services/authService';

const GlobalChatPage = () => {
  const navigate = useNavigate();
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadGlobalChat = async () => {
      try {
        setLocalLoading(true);
        setLocalError(null);
        
        // Verify auth token is present before proceeding
        const token = getToken();
        if (!token) {
          setLocalError('Authentication required. Please log in again.');
          navigate('/');
          return;
        }
        
        // Fetch the global chat room
        const globalRoom = await fetchGlobalChatRoom();
        if (!globalRoom) {
          throw new Error('Failed to load global chat room');
        }
        
        // Switch to the global chat room in context
        await switchRoom(globalRoom);
      } catch (err) {
        console.error('Error loading global chat:', err);
        
        // Check for authentication errors
        if (err.response && err.response.status === 401) {
          setLocalError('Authentication failed. Please log in again.');
          // Don't navigate away automatically - let the user read the error
        } else {
          setLocalError(err.message || 'Failed to load global chat');
        }
        
        // If we've already retried a few times, don't retry again
        if (retryCount < 2) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadGlobalChat();
    
    // Clean up function
    return () => {
      // Any cleanup needed when component unmounts
    };
  }, [switchRoom, navigate, retryCount]);

  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(messageId);
  };

  const handleRetry = () => {
    setRetryCount(0); // Reset retry count
    setLocalError(null);
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
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleRetry}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              {t('retry', language) || 'Retry'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              {t('returnToDashboard', language)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaArrowLeft /> {t('backToDashboard', language)}
        </button>

        {/* Page Header */}
        <header className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaGlobe className="text-purple-500" size={28} />
            <h1 className="text-3xl font-bold">{t('globalChat', language)}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center">{t('chatWithAllPlayers', language)}</p>
        </header>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-4 mb-8">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            currentUser={currentUser}
            loading={loading}
            roomName={t('globalChat', language)}
            chatType="GLOBAL"
            canDelete={true}
          />
        </div>
      </div>
    </div>
  );
};

export default GlobalChatPage;