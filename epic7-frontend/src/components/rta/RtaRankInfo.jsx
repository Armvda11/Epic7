import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import axiosInstance from '../../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const RtaRankInfo = ({ onClose }) => {
  const { t, language } = useSettings();
  const navigate = useNavigate();
  const [rankInfo, setRankInfo] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankInfo();
  }, []);

  const loadRankInfo = async () => {
    try {
      const [rankResponse, positionResponse] = await Promise.all([
        axiosInstance.get('/api/rta/my-rank'),
        axiosInstance.get('/api/rta/my-position')
      ]);
      setRankInfo(rankResponse.data);
      setPosition(positionResponse.data);
    } catch (error) {
      console.error('Erreur lors du chargement des informations RTA:', error);
    } finally {
      setLoading(false);
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

  const openLeaderboard = () => {
    navigate('/rta-leaderboard');
    onClose?.();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-md w-full mx-4">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-md w-full mx-4 text-gray-900 dark:text-white"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">
            ⚔️ {t("rtaRankInfo", language) || "Informations RTA"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {rankInfo ? (
          <div className="space-y-6">
            {/* Tier actuel */}
            <div className="text-center">
              <div className={`inline-block px-6 py-3 rounded-lg text-xl font-bold ${getRtaTierColor(rankInfo.currentTier)}`}>
                {rankInfo.currentTier}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {rankInfo.currentPoints}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">points</span>
              </div>
              {position && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  #{position} {t("globalRank", language) || "rang mondial"}
                </div>
              )}
            </div>

            {/* Progression vers le tier suivant */}
            {!rankInfo.isMaxTier ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{rankInfo.currentTier}</span>
                  <span>{rankInfo.nextTier}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${rankInfo.progressToNextTier}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {rankInfo.pointsToNextTier}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                    {t("pointsToNext", language) || "points vers"} {rankInfo.nextTier}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-300">
                  {t("maxTierReached", language) || "Tier maximum atteint!"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("legendStatus", language) || "Vous êtes une légende!"}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <button
                onClick={openLeaderboard}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                📊 {t("viewLeaderboard", language) || "Voir le classement"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                {t("close", language) || "Fermer"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              {t("noRtaData", language) || "Aucune donnée RTA disponible"}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RtaRankInfo;
