import React from 'react';
import { motion } from 'framer-motion';

export default function BattleEndOverlay({ status, reward, onReturn }) {
  const isVictory = status === 'VICTOIRE';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      {/* Effet lumineux flottant */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        className={`relative p-10 rounded-3xl shadow-2xl text-center w-[28rem] border-2 
          ${isVictory ? 'bg-gradient-to-br from-green-900/50 to-black border-green-500' : 'bg-gradient-to-br from-red-900/50 to-black border-red-500'}`}
      >
        {/* Aura de lumière */}
        <div className={`absolute -inset-1 blur-xl opacity-20 rounded-3xl z-0 ${isVictory ? 'bg-green-400' : 'bg-red-500'}`} />

        <div className="relative z-10">
          <h2 className={`text-5xl font-extrabold mb-6 drop-shadow-lg ${isVictory ? 'text-green-300' : 'text-red-300'}`}>
            {isVictory ? '🎉 Victoire !' : '💀 Défaite'}
          </h2>

          <p className="text-gray-200 text-lg mb-6 leading-relaxed tracking-wide">
            {isVictory
              ? 'Le boss a été vaincu. Vos héros rentrent victorieux !'
              : "Tous vos héros ont péri... mais l'espoir subsiste."}
          </p>

          {/* Affichage de la récompense */}
          {reward && (
            <div className="bg-black/30 rounded-xl p-4 text-yellow-300 font-semibold text-lg mb-6 border border-yellow-400">
              {reward.message}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReturn}
            className={`px-8 py-3 rounded-xl font-bold tracking-wide text-white shadow-md transition duration-300 ${
              isVictory ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            Retour au Tableau de Bord
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
