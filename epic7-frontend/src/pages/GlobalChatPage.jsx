import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import ChatComponent from '../components/chat/ChatComponent';
import { MusicController } from '../components/ui';

const GlobalChatPage = () => {
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { preloadMusic, playDashboardMusic } = useMusic();

  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
  }, [preloadMusic, playDashboardMusic]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <MusicController />
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 transition"
          >
            <FaArrowLeft className="mr-2" /> {t("backToDashboard", language)}
          </button>
          <h1 className="text-2xl font-bold">{t("globalChat", language)}</h1>
          <div className="w-6"></div> {/* Spacer for centering */}
        </header>

        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl flex-1 overflow-hidden flex flex-col">
          <ChatComponent roomType="global" />
        </div>
      </div>
    </main>
  );
};

export default GlobalChatPage;