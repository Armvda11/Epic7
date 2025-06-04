import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import ChatComponent from '../components/chat/ChatComponent';
import { fetchGuildById } from '../services/guildService';
import { MusicController } from '../components/ui';

const GuildChatPage = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t, language } = useSettings();
  const { preloadMusic, playDashboardMusic } = useMusic();
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    const loadGuild = async () => {
      try {
        setLoading(true);
        const guildData = await fetchGuildById(guildId);
        setGuild(guildData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading guild:', err);
        setError(err.message || 'Impossible de charger les données de la guilde');
        setLoading(false);
      }
    };

    if (guildId) {
      loadGuild();
    }
  }, [guildId, preloadMusic, playDashboardMusic]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
        <MusicController />
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </main>
    );
  }

  if (error || !guild) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
        <MusicController />
        <div className="bg-red-100 dark:bg-red-900 p-6 rounded-lg max-w-md text-center">
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error || t("guildNotFound", language)}
          </p>
          <button 
            onClick={() => navigate("/guilds")} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            {t("backToGuilds", language)}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
      <MusicController />
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate("/guilds")}
            className="flex items-center text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 transition"
          >
            <FaArrowLeft className="mr-2" /> {t("backToGuilds", language)}
          </button>
          
          <div className="flex items-center">
            <FaUsers className="mr-2 text-purple-500" />
            <h1 className="text-2xl font-bold">{guild.name} - {t("chat", language)}</h1>
          </div>
          
          <div className="w-6"></div> {/* Spacer for centering */}
        </header>

        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl flex-1 overflow-hidden flex flex-col">
          <ChatComponent roomType="guild" guildId={guildId} />
        </div>
      </div>
    </main>
  );
};

export default GuildChatPage;