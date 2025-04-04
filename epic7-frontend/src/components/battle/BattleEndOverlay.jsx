import React from 'react';
import { motion } from 'framer-motion';

export default function BattleEndOverlay({ status, onReturn }) {
  const isVictory = status === 'VICTOIRE';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        className={`p-10 rounded-3xl shadow-2xl text-center w-[28rem] border-2 
          ${isVictory ? 'bg-gradient-to-br from-green-900/40 to-black border-green-500' : 'bg-gradient-to-br from-red-900/40 to-black border-red-500'}`}
      >
        <h2 className={`text-5xl font-extrabold mb-6 drop-shadow-lg ${isVictory ? 'text-green-400' : 'text-red-400'}`}>
          {isVictory ? '🎉 Victoire !' : '💀 Défaite'}
        </h2>
        <p className="text-gray-200 text-lg mb-8 leading-relaxed">
          {isVictory
            ? 'Le boss a été vaincu. Vos héros rentrent victorieux !'
            : "Tous vos héros ont péri... mais l'espoir subsiste."}
        </p>
        <button
          onClick={onReturn}
          className={`px-6 py-3 rounded-xl font-bold tracking-wide text-white shadow-md transition duration-300 
            ${isVictory ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          Retour au Tableau de Bord
        </button>
      </motion.div>
    </motion.div>
  );

}