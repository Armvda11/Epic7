// HeroPortraitOverlay.jsx
// Affiche le portrait, le nom et les HP du héros actif (en bas à gauche)

import React from 'react';
import { heroImg } from '../heroUtils';

export default function HeroPortraitOverlay({ hero }) {
  if (!hero) return null;

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-black/60 px-4 py-3 rounded-xl shadow-xl border border-gray-700 backdrop-blur z-40">
      <img
        src={heroImg(hero.name)}
        alt={hero.name}
        className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500"
      />
      <div className="flex flex-col">
        <span className="text-white font-bold text-sm truncate max-w-[10rem]">{hero.name}</span>
        <span className="text-sm text-gray-300">HP : {hero.currentHp} / {hero.maxHp}</span>
      </div>
    </div>
  );
}
