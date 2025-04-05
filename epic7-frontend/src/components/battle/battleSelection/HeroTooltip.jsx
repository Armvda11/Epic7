// src/components/battleSelection/HeroTooltip.jsx
import React from 'react';

export default function HeroTooltip({ hero }) {
  return (
    <div className="absolute left-full top-0 ml-2 p-3 bg-black/80 text-white rounded-xl shadow-lg text-sm w-48 z-40 border border-indigo-500 animate-fade-in">
      <p className="font-bold text-indigo-300 mb-1">{hero.name}</p>
      <p className="text-gray-300">Rareté : <span className="font-semibold text-yellow-400">{hero.rarity}</span></p>
      <p className="text-gray-300">Élément : <span className="font-semibold text-blue-400">{hero.element}</span></p>
      <p className="text-gray-300">Attaque : {hero.totalAttack}</p>
      <p className="text-gray-300">Défense : {hero.totalDefense}</p>
      <p className="text-gray-300">PV : {hero.totalHealth}</p>
      <p className="text-gray-300">Vitesse : {hero.totalSpeed}</p>
    </div>
  );
}
