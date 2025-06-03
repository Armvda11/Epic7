import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { heroImg } from '../heroUtils';
import API from '../../api/axiosInstance';

export default function RtaMatchmakingScreen({ waitingTime, onCancel, selectedHeroes }) {
  const [userProfile, setUserProfile] = useState(null);

  // Récupération du profil utilisateur avec les points RTA
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await API.get('/user/me');
        setUserProfile(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Formatage du temps d'attente
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Fonction utilitaire pour obtenir la couleur du tier
  const getTierColor = (tier) => {
    const colors = {
      'BRONZE': 'text-orange-400',
      'SILVER': 'text-gray-400',
      'GOLD': 'text-yellow-400',
      'PLATINUM': 'text-cyan-400',
      'DIAMOND': 'text-blue-400',
      'MASTER': 'text-purple-400',
      'LEGEND': 'text-red-400'
    };
    return colors[tier] || 'text-gray-400';
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center text-white">
      {/* Informations RTA de l'utilisateur */}
      {userProfile && (
        <div className="absolute top-6 left-6 bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
          <h3 className="text-lg font-semibold mb-2">Votre Rang RTA</h3>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${getTierColor(userProfile.rtaTier)}`}>
              {userProfile.rtaTier}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-300">Points RTA</div>
              <div className="text-xl font-bold text-purple-300">{userProfile.rtaPoints}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-2">Recherche d'adversaire</h1>
        <p className="text-lg text-gray-300">Temps d'attente: {formatTime(waitingTime)}</p>
      </div>

      <div className="relative w-64 h-64 mb-16">
        {/* Animation de recherche */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-500 opacity-50"></div>
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-purple-300"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0.2, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
        
        {/* Pulsation au centre */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="text-5xl">⚔️</div>
        </motion.div>
      </div>

      {/* Équipe sélectionnée */}
      <div className="mb-12">
        <h3 className="text-center text-xl font-semibold mb-3">Votre équipe</h3>
        <div className="flex gap-4">
          {selectedHeroes.map((hero, index) => (
            <motion.div
              key={index}
              className="w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500 shadow-lg"
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <img
                src={heroImg(hero.name)}
                alt={hero.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <button
        onClick={onCancel}
        className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold tracking-wide shadow-lg"
      >
        Annuler la recherche
      </button>
    </div>
  );
}