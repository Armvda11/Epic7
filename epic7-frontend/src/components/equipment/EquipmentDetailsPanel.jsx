// src/components/equipment/EquipmentDetailsPanel.jsx
import React from "react";
import { useSettings } from "../../context/SettingsContext";
import { motion } from "framer-motion";
import { FaBolt, FaHeart } from "react-icons/fa";
import { GiSwordWound, GiShield } from "react-icons/gi";

// Composant pour afficher les détails d'un équipement pour leur modification
// il est utiliser dans le composant HeroView pour afficher les détails de l'équipement sélectionné
// et permettre à l'utilisateur de l'équiper ou de le déséquiper
// j'aurais pu le fusionner avec un autre composant mais je préfère le garder séparé pour la clarté
// et la réutilisabilité
// Surtout Flemme de le faire 
const EquipmentDetailsPanel = ({ equipment, currentHeroId, onEquip, onUnequip }) => {
  const { t, language, theme } = useSettings();
  
  if (!equipment) return null;

  const typeColors = {
    WEAPON: "from-red-400 to-pink-500",
    ARMOR: "from-blue-400 to-indigo-500",
    NECKLACE: "from-yellow-400 to-amber-500",
    BOOTS: "from-green-400 to-emerald-500",
  };

  const statIcons = {
    attack: <GiSwordWound className="text-red-500" />,
    defense: <GiShield className="text-blue-500" />,
    speed: <FaBolt className="text-yellow-500" />,
    health: <FaHeart className="text-pink-500" />
  };

  const getBonusTextColor = (value) => {
    if (value > 0) return theme === 'dark' ? 'text-green-400' : 'text-green-600';
    if (value < 0) return theme === 'dark' ? 'text-red-400' : 'text-red-600';
    return theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  };

  const getBonusText = (value) => {
    if (value > 0) return `+${value}`;
    return value;
  };

  return (
    <div className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
      <div className={`p-3 mb-4 rounded-lg bg-gradient-to-r ${typeColors[equipment.type] || "from-purple-400 to-indigo-500"} bg-opacity-10`}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{equipment.name}</h3>
            <p className="text-sm opacity-80">
              {t(equipment.type.toLowerCase(), language) || equipment.type}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            theme === 'dark' ? 'bg-white/20' : 'bg-white/60'
          }`}>
            {t(equipment.rarity.toLowerCase(), language) || equipment.rarity}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{t("level", language) || "Niveau"}</span>
          <span className={`px-2 py-0.5 rounded ${
            theme === 'dark' ? 'bg-indigo-900/50' : 'bg-indigo-100'
          }`}>
            {equipment.level}
          </span>
        </div>
        
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
            style={{ width: `${(equipment.experience / 100) * 100}%` }}
          ></div>
        </div>
        <p className="text-xs text-right mt-1">
          XP: {equipment.experience}/100
        </p>
      </div>

      <div className={`space-y-3 mb-4 p-3 rounded-lg ${
        theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50/80 border border-indigo-100'
      }`}>
        <h4 className="font-semibold mb-2">{t("statBonuses", language) || "Bonus de statistiques"}</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            {statIcons.attack}
            <span>{t("attack", language) || "Attaque"}:</span>
            <span className={getBonusTextColor(equipment.attackBonus)}>
              {getBonusText(equipment.attackBonus)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {statIcons.defense}
            <span>{t("defense", language) || "Défense"}:</span>
            <span className={getBonusTextColor(equipment.defenseBonus)}>
              {getBonusText(equipment.defenseBonus)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {statIcons.speed}
            <span>{t("speed", language) || "Vitesse"}:</span>
            <span className={getBonusTextColor(equipment.speedBonus)}>
              {getBonusText(equipment.speedBonus)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {statIcons.health}
            <span>{t("health", language) || "Santé"}:</span>
            <span className={getBonusTextColor(equipment.healthBonus)}>
              {getBonusText(equipment.healthBonus)}
            </span>
          </div>
        </div>
      </div>

      {equipment.equipped ? (
        <motion.button 
          onClick={() => onUnequip(equipment.id)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          {t("unequip", language) || "Déséquiper"}
        </motion.button>
      ) : (
        <motion.button 
          onClick={() => onEquip(equipment.id)} 
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-2 px-4 rounded-lg shadow-md transition duration-300"
        >
          {t("equip", language) || "Équiper"}
        </motion.button>
      )}
    </div>
  );
};

export default EquipmentDetailsPanel;
