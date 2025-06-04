import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { MusicController } from '../components/ui';

const RtaLeaderboard = () => {
  const { t, language } = useSettings();
  const { preloadMusic, playDashboardMusic } = useMusic();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRankInfo, setMyRankInfo] = useState(null);
  const [myPosition, setMyPosition] = useState(null);

  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    loadLeaderboard();
    loadMyRankInfo();
    loadMyPosition();
  }, [preloadMusic, playDashboardMusic]);

  const loadLeaderboard = async () => {
    try {
      const response = await axiosInstance.get('/api/rta/leaderboard?limit=100');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du leaderboard:', error);
      toast.error(t("leaderboardLoadError", language) || "Erreur lors du chargement du classement");
    } finally {
      setLoading(false);
    }
  };

  const loadMyRankInfo = async () => {
    try {
      const response = await axiosInstance.get('/api/rta/my-rank');
      setMyRankInfo(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des informations de rang:', error);
    }
  };

  const loadMyPosition = async () => {
    try {
      const response = await axiosInstance.get('/api/rta/my-position');
      setMyPosition(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de la position:', error);
    }
  };

  const getRtaTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'bronze':
        return 'bg-amber-600 text-white';
      case 'silver':
        return 'bg-gray-400 text-black';
      case 'gold':
        return 'bg-yellow-400 text-black';
      case 'platinum':
        return 'bg-cyan-400 text-black';
      case 'diamond':
        return 'bg-blue-400 text-white';
      case 'master':
        return 'bg-purple-500 text-white';
      case 'grandmaster':
        return 'bg-red-500 text-white';
      case 'legend':
        return 'bg-gradient-to-r from-yellow-400 to-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${position}`;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-4">
      <MusicController />
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-300 mb-2">
            ⚔️ {t("rtaLeaderboard", language) || "Classement RTA"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t("rtaLeaderboardDesc", language) || "Les meilleurs joueurs de l'Arène en Temps Réel"}
          </p>
        </motion.div>

        {/* Ma position */}
        {myRankInfo && (
          <motion.div
            className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300 mb-4">
              📊 {t("myRtaRank", language) || "Mon Rang RTA"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {myPosition ? `#${myPosition}` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("globalPosition", language) || "Position Globale"}
                </div>
              </div>
              <div className="text-center">
                <div className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${getRtaTierColor(myRankInfo.currentTier)}`}>
                  {myRankInfo.currentTier}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {myRankInfo.currentPoints} points
                </div>
              </div>
              <div className="text-center">
                {!myRankInfo.isMaxTier ? (
                  <>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {myRankInfo.pointsToNextTier}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("pointsToNext", language) || "points vers"} {myRankInfo.nextTier}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl">🏆</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("maxTierReached", language) || "Tier maximum"}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">
              🏆 {t("topPlayers", language) || "Top Joueurs"}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#3a3660]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("position", language) || "Position"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("player", language) || "Joueur"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("tier", language) || "Tier"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("points", language) || "Points"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("winRate", language) || "Taux de victoire"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t("matches", language) || "Matchs"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboard.map((player, index) => (
                  <motion.tr
                    key={player.userId}
                    className="hover:bg-gray-50 dark:hover:bg-[#3a3660] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold">
                        {getPositionIcon(player.position)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">
                        {player.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRtaTierColor(player.rtaTier)}`}>
                        {player.rtaTier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                        {player.rtaPoints}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium">
                          {player.getWinRate ? player.getWinRate().toFixed(1) : 
                           ((player.winNumber / (player.winNumber + player.loseNumber)) * 100).toFixed(1) || 0}%
                        </div>
                        <div className={`ml-2 w-12 h-2 rounded-full ${
                          (player.getWinRate ? player.getWinRate() : 
                           ((player.winNumber / (player.winNumber + player.loseNumber)) * 100) || 0) >= 50 
                            ? 'bg-green-400' : 'bg-red-400'
                        }`} style={{
                          width: `${Math.max(12, (player.getWinRate ? player.getWinRate() : 
                            ((player.winNumber / (player.winNumber + player.loseNumber)) * 100) || 0) * 0.8)}px`
                        }} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {player.winNumber + player.loseNumber} 
                      <span className="ml-1 text-xs">({player.winNumber}V-{player.loseNumber}D)</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default RtaLeaderboard;
