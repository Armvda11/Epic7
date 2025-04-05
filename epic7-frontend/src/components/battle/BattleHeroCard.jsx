import React from 'react';
import { motion } from 'framer-motion';
import BattleHealthBar from './HealthBar';
import { heroImg } from '../heroUtils';

export default function BattleHeroCard({ hero, isCurrent, isNext, highlight, onClick, isSelected }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 ease-out 
        ${highlight || ''} 
        ${isCurrent ? 'z-20' : 'z-10'}`}
    >
      {/* Effet ombre au sol */}
      <div className="absolute bottom-0 w-24 h-4 bg-black/60 rounded-full blur-md opacity-60 -z-10" />

      {/* Image du héros */}
      <motion.img
        src={heroImg(hero.name)}
        alt={hero.name}
        className="w-28 h-40 object-contain drop-shadow-2xl pointer-events-none"
        initial={{ y: 0 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Badges */}
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

      {/* Nom et HP */}
      <div className="mt-2 w-full px-2">
        <h3 className="text-sm font-semibold text-center text-white truncate">{hero.name}</h3>
        <BattleHealthBar current={hero.currentHp} max={hero.maxHp} />
        <p className="text-center text-xs text-gray-300 mt-1">{hero.currentHp} / {hero.maxHp}</p>
      </div>
    </motion.div>
  );
}
