import React from 'react';
import BattleHealthBar from './HealthBar';
import { motion } from 'framer-motion';

export default function BattleHeroCard({ hero, isCurrent, isNext, highlight, onClick, isSelected }) {
  const getHeroImage = (name) =>
    `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative w-40 bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-xl border-2 p-4 transition duration-300 
        ${isCurrent ? 'border-yellow-400 animate-pulse' : isSelected ? 'border-green-500 ring-2 ring-green-400' : 'border-gray-700'} 
        ${highlight}`}
      onClick={onClick}
    >
      {/* Badge ⏭️ Prochain */}
      {isNext && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full shadow-md z-20">
          ⏭️ Prochain
        </div>
      )}

      {/* Badge ✅ Sélectionné */}
      {isSelected && (
        <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-20">
          ✅
        </div>
      )}

      {/* Image du héros */}
      <div className="relative w-full h-32 mb-2">
        <img
          src={getHeroImage(hero.name)}
          alt={hero.name}
          className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]"
        />
      </div>

      {/* Nom et barre de vie */}
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
