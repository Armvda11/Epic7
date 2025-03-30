import React from "react";
import { motion } from "framer-motion";

const rarityColors = {
  COMMON: "bg-gray-700",
  RARE: "bg-blue-600",
  EPIC: "bg-purple-600",
  LEGENDARY: "bg-yellow-500 text-black",
};

const typeIcons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  BOOTS: "🥾",
  NECKLACE: "📿",
};

// Ce composant représente une carte d'équipement 
const EquipmentCard = ({ equipment, onClick }) => {
  const rarityClass = rarityColors[equipment.rarity] || "bg-gray-800";
  const icon = typeIcons[equipment.type] || "❓";

  return (
    <motion.div
      className={`w-40 p-3 rounded-xl shadow-md cursor-pointer transition transform hover:scale-105 ${rarityClass}`}
      onClick={onClick}
      whileHover={{ y: -5 }}
    >
      <div className="text-4xl text-center">{icon}</div>
      <h3 className="text-lg font-bold text-center mt-2 truncate">{equipment.name}</h3>
      <p className="text-sm text-center text-gray-200 mt-1">{equipment.type}</p>
      <p className="text-xs text-center text-gray-400">
        ⭐ Lv.{equipment.level} | XP {equipment.experience}
      </p>
      <p className="text-xs text-center mt-1">
        {equipment.equipped ? "✅ Équipé" : "🎒 En inventaire"}
      </p>
    </motion.div>
  );
};

export default EquipmentCard;
