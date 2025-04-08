import React from 'react';
import { motion } from 'framer-motion';
import BattleHealthBar from './HealthBar';
import { heroImg } from '../heroUtils';

export default function BattleHeroCard({ hero, isCurrent, isNext, highlight, onClick, isSelected }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 ease-out select-none
        ${highlight || ''} 
        ${isCurrent ? 'z-20' : 'z-10'}`}
    >
      {/* Ombre au sol */}
      <div className="absolute bottom-0 w-24 h-5 bg-black/50 rounded-full blur-sm opacity-70 -z-10" />

      {/* Image du héros flottante */}
      <motion.img
        src={heroImg(hero.name)}
        alt={hero.name}
        className="w-28 h-40 object-contain pointer-events-none drop-shadow-[0_0_25px_rgba(0,0,0,0.6)]"
        initial={{ y: 0 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Badge de tour */}
      <div className="absolute top-1 right-1 flex gap-1 z-30">
        {isNext && (
          <div className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow">
            ⏭️
          </div>
        )}
        {isSelected && (
          <div className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            ✅
          </div>
        )}
      </div>

      {/* Infos héros */}
      <div className="mt-1 w-full px-2 text-white text-center">
        <div className="text-sm font-semibold truncate">{hero.name}</div>
        <BattleHealthBar current={hero.currentHp} max={hero.maxHp} />
        <div className="text-xs text-gray-300 mt-0.5">{hero.currentHp} / {hero.maxHp}</div>
      </div>
    </motion.div>
  );
}
