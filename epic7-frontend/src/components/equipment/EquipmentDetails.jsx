import React from "react";
import { motion } from "framer-motion";

const rarityStyles = {
  COMMON: "text-gray-300",
  NORMAL: "text-gray-400",
  RARE: "text-blue-400",
  EPIC: "text-purple-400",
  LEGENDARY: "text-yellow-300",
};

const typeIcons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  BOOTS: "🥾",
  NECKLACE: "📿",
};

const EquipmentDetails = ({ equipment }) => {
  const rarityClass = rarityStyles[equipment.rarity] || "text-white";
  const icon = typeIcons[equipment.type] || "❓";

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-5xl mb-2">{icon}</div>
      <h2 className={`text-xl font-bold ${rarityClass}`}>{equipment.name}</h2>
      <p className="text-sm text-gray-300 mt-1">{equipment.type}</p>

      <p className="text-sm mt-1">⭐ Niveau {equipment.level}</p>
      <p className="text-xs text-gray-400 mb-2">XP : {equipment.experience}</p>

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
          <p className="text-green-400">Équipé par <strong>{equipment.equippedHeroName}</strong></p>
        ) : (
          <p className="text-gray-400">En inventaire</p>
        )}
      </div>
    </motion.div>
  );
};

export default EquipmentDetails;
