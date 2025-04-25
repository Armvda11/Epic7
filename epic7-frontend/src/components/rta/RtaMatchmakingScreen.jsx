import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { heroImg } from '../heroUtils';

export default function RtaMatchmakingScreen({ waitingTime, onCancel, selectedHeroes }) {
  // Formatage du temps d'attente
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center text-white">
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