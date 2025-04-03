import React from 'react';
import BattleHealthBar from './HealthBar';
import { motion } from 'framer-motion';

export default function BattleHeroCard({ hero, isCurrent, highlight, onClick }) {
  const getHeroImage = (name) => `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative w-40 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-xl border-2 p-4 transform transition duration-300 hover:shadow-2xl ${
        isCurrent ? 'border-yellow-400 animate-pulse' : 'border-gray-700'
      } ${highlight}`}
      onClick={onClick}
    >
      <div className="relative w-full h-32 mb-2">
        <img
          src={getHeroImage(hero.name)}
          alt={hero.name}
          className="w-full h-full object-contain drop-shadow-lg"
        />
      </div>
      <h3 className="text-center text-sm font-bold text-white truncate">
        {hero.name}
      </h3>
      <BattleHealthBar current={hero.currentHp} max={hero.maxHp} />
      <p className="text-center text-xs text-gray-300 mt-1">
        {hero.currentHp} / {hero.maxHp}
      </p>
    </motion.div>
  );
}