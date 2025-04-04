// src/components/equipment/EquipmentDetailsPanel.jsx
import React from "react";
import { useSettings } from "../../context/SettingsContext";

// Composant pour afficher les détails d'un équipement pour leur modification
// il est utiliser dans le composant HeroView pour afficher les détails de l'équipement sélectionné
// et permettre à l'utilisateur de l'équiper ou de le déséquiper
// j'aurais pu le fusionner avec un autre composant mais je préfère le garder séparé pour la clarté
// et la réutilisabilité
// Surtout Flemme de le faire 
const EquipmentDetailsPanel = ({ equipment, currentHeroId, onEquip, onUnequip }) => {
  const { t, language } = useSettings();
  
  if (!equipment) return null;

  return (
    <div className="text-gray-900 dark:text-white">
      <h3 className="text-xl font-bold text-center mb-2">{equipment.name}</h3>
      <p className="text-sm text-center mb-2">{t(equipment.rarity.toLowerCase(), language)} • {t("level", language)} {equipment.level} • XP {equipment.experience}</p>

      <div className="space-y-1 text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-3">
        <p>⚔️ {t("attack", language)}: {equipment.attackBonus}</p>
        <p>🛡️ {t("defense", language)}: {equipment.defenseBonus}</p>
        <p>💨 {t("speed", language)}: {equipment.speedBonus}</p>
        <p>❤️ {t("health", language)}: {equipment.healthBonus}</p>
      </div>

      {equipment.equipped ? (
        <button 
          onClick={() => onUnequip(equipment.id)} 
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition"
        >
          {t("unequip", language)}
        </button>
      ) : (
        <button 
          onClick={() => onEquip(equipment.id)} 
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition"
        >
          {t("equip", language)}
        </button>
      )}
    </div>
  );
};

export default EquipmentDetailsPanel;
