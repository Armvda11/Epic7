import React from 'react';
import { motion } from 'framer-motion';

export default function BattleForfeitButton({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 px-6 py-3 rounded-full font-bold tracking-wide text-white text-sm uppercase 
        bg-gradient-to-br from-red-700 to-red-900 backdrop-blur-md shadow-xl border border-red-500/60
        hover:shadow-red-600/40 transition-all duration-300"
    >
      ⚠️ Abandonner
    </motion.button>
  );
}
