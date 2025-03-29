import React from 'react';
import { motion } from 'framer-motion';
import { useSettings } from "../context/SettingsContext";

// Mapping couleur de rareté
const rarityColors = {
  COMMON: 'bg-gray-600',
  RARE: 'bg-blue-600',
  EPIC: 'bg-purple-600',
  LEGENDARY: 'bg-yellow-500 text-black',
};

const HeroCard = ({ heroInstance, onSelect }) => {
  const { hero, level, experience, locked } = heroInstance;
  const code = hero.code.toLowerCase();
  const rarityClass = rarityColors[hero.rarity] || 'bg-gray-700';

  const { language, t } = useSettings();

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(heroInstance)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(heroInstance)}
      className="relative bg-cardBg text-white rounded-xl shadow-md p-4 cursor-pointer group hover:ring-2 ring-purple-400 transition outline-none overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Badge de rareté */}
      <span
        className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold uppercase rounded ${rarityClass}`}
      >
        {hero.rarity}
      </span>

      {/* Image du héros */}
      <figure className="overflow-hidden rounded-lg shadow-inner">
        <picture>
          <source srcSet={`/epic7-Hero/avif/${code}.avif`} type="image/avif" />
          <source srcSet={`/epic7-Hero/webp/${code}.webp`} type="image/webp" />
          <img
            src={`/epic7-Hero/sprite-hero/${code}.png`}
            alt={`Portrait de ${hero.name}`}
            className="w-full h-44 object-contain rounded-lg group-hover:scale-105 transition-transform duration-300 ease-in-out"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
            }}
          />
        </picture>
        <figcaption className="sr-only">{hero.name}</figcaption>
      </figure>

      {/* Infos du héros */}
      <section className="mt-4">
        <h3 className="text-xl font-semibold">{hero.name}</h3>
        <p className="text-sm text-gray-300 mb-2">
          🔮 {hero.element}
        </p>
        <div className="text-sm flex justify-between">
          <span>📈 {t("level", language)} {level}</span>
          <span>✨ XP {experience}</span>
        </div>
        <p className="text-xs text-right mt-1 text-gray-400">
          {locked ? `🔒 ${t("locked", language)}` : `🔓 ${t("unlocked", language)}`}
        </p>
      </section>
    </motion.article>
  );
};

export default HeroCard;
