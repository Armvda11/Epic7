// HeroCard.jsx
import React, { useState } from 'react';

const HeroCard = ({ heroInstance, onSelect }) => {
  const { hero } = heroInstance;
  const code = hero.code.toLowerCase();

  return (
    <div
      onClick={() => onSelect(heroInstance)}
      className="bg-gray-800 rounded-xl shadow-lg p-4 text-white w-full cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
    >
      <picture>
        <source srcSet={`/epic7-Hero/avif/${code}.avif`} type="image/avif" />
        <source srcSet={`/epic7-Hero/avif/${code}.webp`} type="image/webp" />
        <img
          src={`/epic7-Hero/sprite-hero/${code}.png`}
          alt={hero.name}
          className="w-full h-auto mb-4 rounded-lg object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
          }}
        />
      </picture>

      <h3 className="text-xl font-semibold">{hero.name}</h3>
      <p>Élément : {hero.element}</p>
      <p>Rareté : {hero.rarity}</p>
    </div>
  );
};

export default HeroCard;