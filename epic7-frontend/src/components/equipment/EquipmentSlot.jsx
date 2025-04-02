import React from "react";
import { useSettings } from "../../context/SettingsContext";

const icons = {
  WEAPON: "⚔️",
  ARMOR: "🛡️",
  NECKLACE: "📿",
  BOOTS: "🥾",
};

// ce composant représente un emplacement d'équipement
// il affiche une icône selon le type d'équipement et le nom de l'équipement s'il est présent
const EquipmentSlot = ({ type, equipment, onClick }) => {
  const { t, language } = useSettings();
  
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl p-4 w-24 h-24 flex flex-col items-center justify-center ${
        equipment ? "bg-blue-600 dark:bg-blue-700" : "bg-gray-300 dark:bg-gray-700"
      } text-gray-900 dark:text-white`}
    >
      <div className="text-xl mb-1">
        {icons[type] || "❓"}
      </div>
      <p className="text-xs font-semibold text-center">
        {equipment ? equipment.name : t(type.toLowerCase(), language)}
      </p>
    </div>
  );
};

export default EquipmentSlot;

