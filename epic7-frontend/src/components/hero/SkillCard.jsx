import React from "react";
import { useSettings } from "../../context/SettingsContext";

/**
 * Composant d'affichage d'une compétence (skill) d'un héros.
 * - Rond si PASSIVE, carré si ACTIVE
 * - Affiche un tooltip au survol avec les infos de la compétence
 */
const SkillCard = ({ skill, heroName }) => {
  const { t, language, theme } = useSettings();
  const slugified = heroName.toLowerCase().replace(/\s+/g, '-');
  const iconPath = `/icons/${slugified}_skill/${slugified}_skill_${skill.position + 1}.webp`;

  return (
    <div className="flex items-start gap-4">
      <div
        className={`relative group ${skill.category === "PASSIVE" ? "rounded-full" : "rounded-md"}
          ${theme === 'dark' ? 'bg-indigo-900/40' : 'bg-indigo-100'} 
          hover:bg-indigo-200 dark:hover:bg-indigo-800/60 w-16 h-16 flex-shrink-0 flex items-center justify-center cursor-pointer transition shadow-md`}
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

        {/* Tooltip amélioré */}
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-900 dark:text-white text-xs p-3 rounded-lg w-64 z-10 text-left shadow-xl border border-white/20 dark:border-indigo-700/30">
          <p className="font-bold mb-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">{skill.name}</p>
          <p className="mb-2">{skill.description}</p>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            {skill.action && (
              <p className="mt-1 flex items-center gap-1">
                <span className="text-indigo-500 dark:text-indigo-400">🎯</span> 
                <span>{skill.action} • {skill.targetCount} {t("targets", language) || "cible(s)"}</span>
              </p>
            )}
            {skill.scalingStat && skill.scalingFactor && (
              <p className="text-sm mt-1 flex items-center gap-1">
                <span className="text-red-500 dark:text-red-400">⚔️</span> 
                <span>{t("scaling", language) || "Scaling"}: {skill.scalingFactor} × {skill.scalingStat}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description détaillée de la compétence */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base mb-1 flex items-center flex-wrap">
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mr-2">
            {skill.name}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            theme === 'dark' 
              ? skill.category === "PASSIVE" ? 'bg-blue-900/60 text-blue-200' : 'bg-red-900/60 text-red-200' 
              : skill.category === "PASSIVE" ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
          }`}>
            {skill.category === "PASSIVE" ? t("passive", language) || "Passive" : t("active", language) || "Active"}
          </span>
        </div>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {skill.description}
        </p>
        {(skill.action || (skill.scalingStat && skill.scalingFactor)) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {skill.action && (
              <span className={`text-xs ${
                theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'
              }`}>
                🎯 {skill.action} ({skill.targetCount})
              </span>
            )}
            {skill.scalingStat && skill.scalingFactor && (
              <span className={`text-xs ${
                theme === 'dark' ? 'text-amber-300' : 'text-amber-700'
              }`}>
                ⚔️ {t("scaling", language) || "Scaling"}: {skill.scalingFactor} × {skill.scalingStat}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillCard;
