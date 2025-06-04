// HeroPortraitOverlay.jsx
// Affiche le portrait, le nom et les HP du héros actif (en bas à gauche)

import React from 'react';
import { heroImgBattle, heroImgUnknownBattle } from '../heroUtils';

export default function HeroPortraitOverlay({ hero }) {
  if (!hero) return null;

  const handleImageError = (e) => {
    console.error(`Erreur chargement sprite portrait pour ${hero.name}`);
    e.target.onerror = null;
    e.target.src = heroImgUnknownBattle();
  };

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-black/60 px-4 py-3 rounded-xl shadow-xl border border-gray-700 backdrop-blur z-40">
      <img
        src={heroImgBattle(hero.name)}
        alt={hero.name}
        onError={handleImageError}
        className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
      />
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm truncate max-w-[10rem]">{hero.name}</span>
        <span className="text-sm text-gray-300">HP : {hero.currentHp} / {hero.maxHp}</span>
      </div>
    </div>
  );
}
