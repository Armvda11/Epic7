import React from "react";
import { motion } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";

const rarityStyles = {
  COMMON: "text-gray-500 dark:text-gray-300",
  NORMAL: "text-gray-600 dark:text-gray-400",
  RARE: "text-blue-600 dark:text-blue-400",
  EPIC: "text-purple-600 dark:text-purple-400",
  LEGENDARY: "text-yellow-500 dark:text-yellow-300",
};

const typeIcons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  BOOTS: "🥾",
  NECKLACE: "📿",
};

// Ce composant représente les détails d'un équipement
// Il affiche le nom, le type, le niveau, l'expérience et les bonus de stats de l'équipement
const EquipmentDetails = ({ equipment }) => {
  const { t, language } = useSettings();
  const rarityClass = rarityStyles[equipment.rarity] || "text-gray-900 dark:text-white";
  const icon = typeIcons[equipment.type] || "❓";

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-5xl mb-2">{icon}</div>
      <h2 className={`text-xl font-bold ${rarityClass}`}>{equipment.name}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t(equipment.type.toLowerCase(), language)}</p>

      <p className="text-sm mt-1">⭐ {t("level", language)} {equipment.level}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">XP : {equipment.experience}</p>

      {/* Stats bonus */}
      <div className="text-sm text-left w-full mt-2 space-y-1">
        {equipment.attackBonus > 0 && <p>🗡️ ATK : +{equipment.attackBonus}</p>}
        {equipment.defenseBonus > 0 && <p>🛡️ DEF : +{equipment.defenseBonus}</p>}
        {equipment.speedBonus > 0 && <p>⚡ SPD : +{equipment.speedBonus}</p>}
        {equipment.healthBonus > 0 && <p>❤️ HP : +{equipment.healthBonus}</p>}
      </div>

      {/* Status */}
      <div className="mt-4">
        {equipment.equipped ? (
          <p className="text-green-600 dark:text-green-400">{t("equippedOn", language)} <strong>{equipment.equippedHeroName}</strong></p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">{t("inInventory", language)}</p>
        )}
      </div>
    </motion.div>
  );
};

export default EquipmentDetails;
