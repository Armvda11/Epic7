import React from "react";
import { useSettings } from "../../context/SettingsContext";

/**
 * Composant d'affichage d'une compétence (skill) d'un héros.
 * - Rond si PASSIVE, carré si ACTIVE
 * - Affiche un tooltip au survol avec les infos de la compétence
 */
const SkillCard = ({ skill, heroName }) => {
  const { t, language } = useSettings();
  const slugified = heroName.toLowerCase().replace(/\s+/g, '-');
  const iconPath = `/icons/${slugified}_skill/${slugified}_skill_${skill.position + 1}.webp`;

  return (
    <div
      key={skill.id}
      className={`relative group p-2 ${skill.category === "PASSIVE" ? "rounded-full" : "rounded-md"}
        bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 w-16 h-16 flex items-center justify-center cursor-pointer transition`}
    >
      <img
        src={iconPath}
        alt={skill.name}
        className={`w-full h-full object-cover ${skill.category === "PASSIVE" ? "rounded-full" : "rounded-md"}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "/epic7-Hero/avif/unknown.avif";
        }}
      />

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white dark:bg-black text-gray-900 dark:text-white text-xs p-2 rounded-md w-64 z-10 text-left shadow-lg">
        <p className="font-semibold">{skill.name}</p>
        <p>{skill.description}</p>
        {skill.action && (
          <p className="mt-1">🎯 {skill.action} • {skill.targetCount} {t("targets", language) || "cible(s)"}</p>
        )}
        {skill.scalingStat && skill.scalingFactor && (
          <p className="text-sm italic">⚔️ {t("scaling", language) || "Scaling"}: {skill.scalingFactor} × {skill.scalingStat}</p>
        )}
      </div>
    </div>
  );
};

export default SkillCard;
