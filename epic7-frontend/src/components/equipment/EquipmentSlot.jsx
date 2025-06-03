import React from "react";
import { useSettings } from "../../context/SettingsContext";
import { motion } from "framer-motion";

const icons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  NECKLACE: "📿",
  BOOTS: "🥾",
};

const typeColors = {
  WEAPON: "from-red-500 to-pink-600",
  ARMOR: "from-blue-500 to-indigo-600",
  NECKLACE: "from-yellow-500 to-amber-600",
  BOOTS: "from-green-500 to-emerald-600",
};

// ce composant représente un emplacement d'équipement
// il affiche une icône selon le type d'équipement et le nom de l'équipement s'il est présent
const EquipmentSlot = ({ type, equipment, onClick, className = "" }) => {
  const { t, language, theme } = useSettings();
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`cursor-pointer rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300 
        ${equipment 
          ? `bg-gradient-to-br ${typeColors[type] || "from-purple-500 to-indigo-600"} shadow-lg` 
          : `${theme === 'dark' 
              ? 'bg-white/10 border border-white/20' 
              : 'bg-white/60 border border-indigo-100'}`
        } 
        ${theme === 'dark' ? 'text-white' : 'text-gray-800'}
        ${className}`}
    >
      <div className="text-2xl mb-2">
        {icons[type] || "❓"}
      </div>
      <p className="text-xs font-semibold text-center line-clamp-2">
        {equipment ? equipment.name : t(type.toLowerCase(), language)}
      </p>
      
      {equipment && (
        <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
          {equipment.level}
        </div>
      )}
    </motion.div>
  );
};

export default EquipmentSlot;

