import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";

const rarityColors = {
  COMMON: "bg-gray-600",
  RARE: "bg-blue-600",
  EPIC: "bg-purple-600",
  LEGENDARY: "bg-yellow-500 text-black",
};

// Ce composant représente une carte de héros pour afficher les héros d'un autre utilisateur
// Il affiche l'image, le nom, le niveau, l'expérience et les stats du héros sans bouton d'action
const HeroProfileCard = ({ heroInstance, onSelect }) => {
  const { language, t } = useSettings();

  // Support à la fois ancien format (hero.code) et nouveau format (name direct)
  const hero = heroInstance.hero || heroInstance;
  const {
    level,
    experience,
    locked,
    name,
    rarity,
    element,
    totalAttack,
    totalDefense,
    totalSpeed,
    totalHealth,
    code,
  } = hero;

  const imgCode = code?.toLowerCase() || name.toLowerCase().replace(/\s+/g, "-");
  const rarityClass = rarityColors[rarity] || "bg-gray-700";

  return (
    <motion.article
      tabIndex={0}
      onClick={() => onSelect(heroInstance)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(heroInstance)}
      className="relative bg-white dark:bg-[#252042] text-gray-900 dark:text-white rounded-xl shadow-md p-4 cursor-pointer group hover:ring-2 ring-purple-400 transition outline-none overflow-hidden h-[400px] flex flex-col"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Badge de rareté */}
      <span
        className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold uppercase rounded ${rarityClass} z-10`}
      >
        {rarity}
      </span>

      {/* Image du héros - Fixed at top */}
      <figure className="overflow-hidden rounded-lg shadow-inner flex-shrink-0">
        <picture>
          <source srcSet={`/epic7-Hero/avif/${imgCode}.avif`} type="image/avif" />
          <source srcSet={`/epic7-Hero/webp/${imgCode}.webp`} type="image/webp" />
          <img
            src={`/epic7-Hero/sprite-hero/${imgCode}.png`}
            alt={`Portrait de ${name}`}
            className="w-full h-44 object-contain rounded-lg group-hover:scale-105 transition-transform duration-300 ease-in-out"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
            }}
          />
        </picture>
        <figcaption className="sr-only">{name}</figcaption>
      </figure>

      {/* Scrollable content area */}
      <div className="mt-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-1">
        {/* Infos principales */}
        <section className="space-y-1">
          <h3 className="text-xl font-semibold">{name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">🔮 {element}</p>
          <div className="text-sm flex justify-between">
            <span>📈 {t("level", language)} {level}</span>
            <span>✨ XP {experience ?? 0}</span>
          </div>
          <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
            {locked ? `🔒 ${t("locked", language)}` : `🔓 ${t("unlocked", language)}`}
          </p>
        </section>

        {/* Stats bonus affichées en bas */}
        <section className="mt-3 text-xs text-gray-700 dark:text-gray-200 grid grid-cols-2 gap-x-2 gap-y-1">
          <p>⚔️ {t("attack", language)}: <strong>{totalAttack ?? "?"}</strong></p>
          <p>🛡️ {t("defense", language)}: <strong>{totalDefense ?? "?"}</strong></p>
          <p>💨 {t("speed", language)}: <strong>{totalSpeed ?? "?"}</strong></p>
          <p>❤️ {t("health", language)}: <strong>{totalHealth ?? "?"}</strong></p>
        </section>
      </div>
    </motion.article>
  );
};

export default HeroProfileCard;
