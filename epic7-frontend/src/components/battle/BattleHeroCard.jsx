import React from 'react';
import { motion } from 'framer-motion';
import BattleHealthBar from './HealthBar';
import { heroImg } from '../heroUtils';

export default function BattleHeroCard({ hero, isCurrent, isNext, highlight, onClick, isSelected, isAlly = false, isEnemy = false }) {
  // Vérifier que le héros existe
  if (!hero || !hero.name) {
    console.error("BattleHeroCard reçoit un héros invalide:", hero);
    return (
      <div className="relative flex flex-col items-center w-28 h-40 bg-gray-800 rounded-lg p-2 text-white text-center">
        <div>Hero invalide</div>
      </div>
    );
  }
  
  // Debug de l'image
  console.log(`Héros: ${hero.name} - URL image: ${heroImg(hero.name)}`);
  
  // Gérer les erreurs d'image
  const handleImageError = (e) => {
    console.error(`Erreur chargement image pour ${hero.name}`);
    e.target.onerror = null;
    e.target.src = '/epic7-Hero/webp/unknown.webp'; // Image par défaut
  };
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 ease-out select-none
        ${highlight || ''} 
        ${isCurrent ? 'z-20' : 'z-10'}
        ${isAlly ? 'border-l-4 border-l-green-500' : ''}
        ${isEnemy ? 'border-l-4 border-l-red-500' : ''}`}
    >
      {/* Ombre au sol */}
      <div className="absolute bottom-0 w-24 h-5 bg-black/50 rounded-full blur-sm opacity-70 -z-10" />

      {/* Image du héros flottante */}
      <motion.img
        src={heroImg(hero.name)}
        alt={hero.name}
        onError={handleImageError}
        className={`w-28 h-40 object-contain pointer-events-none
          ${isEnemy ? 'brightness-90 contrast-110 drop-shadow-[0_0_15px_rgba(255,0,0,0.4)]' : 'drop-shadow-[0_0_25px_rgba(0,0,0,0.6)]'}
          ${isAlly ? 'drop-shadow-[0_0_15px_rgba(0,255,0,0.3)]' : ''}
        `}
        initial={{ y: 0 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Badge de tour et statut */}
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
      
      {/* Badge allié/ennemi */}
      <div className="absolute top-1 left-1 z-30">
        {isAlly && (
          <div className="bg-green-600/80 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            Allié
          </div>
        )}
        {isEnemy && (
          <div className="bg-red-600/80 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            Ennemi
          </div>
        )}
      </div>

      {/* Infos héros */}
      <div className="mt-1 w-full px-2 text-white text-center">
        <div className={`text-sm font-semibold truncate ${isAlly ? 'text-green-100' : isEnemy ? 'text-red-100' : ''}`}>
          {hero.name}
        </div>
        <BattleHealthBar 
          current={hero.currentHp || 0} 
          max={hero.maxHp || 1} 
          isAlly={isAlly}
          isEnemy={isEnemy}
        />
        <div className="text-xs text-gray-300 mt-0.5">
          {(hero.currentHp !== undefined ? hero.currentHp : '?')} / 
          {(hero.maxHp !== undefined ? hero.maxHp : '?')}
        </div>
      </div>
    </motion.div>
  );
}
