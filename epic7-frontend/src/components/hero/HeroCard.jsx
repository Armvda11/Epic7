import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { heroImg, heroImgAvif, heroImgUnknown } from "../heroUtils"; 

const rarityColors = {
  COMMON: "bg-gray-600",
  RARE: "bg-blue-600",
  EPIC: "bg-purple-600",
  LEGENDARY: "bg-yellow-500 text-black",
};

// Ce composant représente une carte de héros
// Il affiche l'image, le nom, le niveau, l'expérience et les stats du héros
const HeroCard = ({ heroInstance, onSelect }) => {
  const navigate = useNavigate();
  const { language, t } = useSettings();

  // Support à la fois ancien format (hero.code) et nouveau format (name direct)
  const hero = heroInstance.hero || heroInstance;
  const {
    id,
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

  const handleViewMore = (e) => {
    e.stopPropagation();
    navigate(`/hero/${heroInstance.id}`);
  };

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(heroInstance)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(heroInstance)}
      className="relative bg-white dark:bg-[#252042] text-gray-900 dark:text-white rounded-xl shadow-md p-4 cursor-pointer group hover:ring-2 ring-purple-400 transition outline-none overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Badge de rareté */}
      <span
        className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold uppercase rounded ${rarityClass}`}
      >
        {rarity}
      </span>

      {/* Image du héros */}
      <figure className="overflow-hidden rounded-lg shadow-inner">
        <picture>

        <source srcSet={heroImg(imgCode)} type="image/webp" />
          <img
            src={heroImg(imgCode)}
            alt={`Portrait de ${name}`}
            className="w-full h-44 object-contain rounded-lg group-hover:scale-105 transition-transform duration-300 ease-in-out"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = heroImgUnknown;
            }}
          />
        </picture>
        <figcaption className="sr-only">{name}</figcaption>
      </figure>

      {/* Infos principales */}
      <section className="mt-4 space-y-1">
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

      {/* Bouton "Voir plus" */}
      <button
        onClick={handleViewMore}
        className="mt-4 w-full bg-purple-600 hover:bg-purple-700 py-1 rounded text-sm transition text-white"
      >
        {t("seeMore", language) || "Voir plus"}
      </button>
    </motion.article>
  );
};

export default HeroCard;
