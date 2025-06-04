// src/components/battleSelection/HeroTooltip.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../../context/SettingsContext';
import { FaStar, FaHeart, FaBolt, FaGem, FaUser } from 'react-icons/fa';
import { GiSwordWound, GiShield, GiRunningNinja } from 'react-icons/gi';

export default function HeroTooltip({ hero }) {
  const { theme, t, language } = useSettings();
  const [position, setPosition] = useState({ right: false });
  
  // Effet pour détecter si le tooltip dépasse de l'écran
  useEffect(() => {
    const handleResize = () => {
      const tooltipElement = document.querySelector('.hero-tooltip');
      if (tooltipElement) {
        const rect = tooltipElement.getBoundingClientRect();
        const isOffScreen = rect.right > window.innerWidth;
        setPosition({ right: isOffScreen });
      }
    };
    
    // Vérifier immédiatement après le rendu
    setTimeout(handleResize, 10);
    
    // Ajouter un écouteur pour les redimensionnements
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Couleurs selon la rareté
  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'LEGENDARY':
        return 'from-yellow-400 to-orange-500 text-yellow-300';
      case 'EPIC':
        return 'from-purple-400 to-pink-500 text-purple-300';
      case 'RARE':
        return 'from-blue-400 to-cyan-500 text-blue-300';
      default:
        return 'from-gray-400 to-gray-600 text-gray-300';
    }
  };

  // Couleur de l'élément
  const getElementColor = (element) => {
    const colors = {
      FIRE: 'text-red-400',
      ICE: 'text-blue-400',
      EARTH: 'text-green-400',
      DARK: 'text-purple-400',
      LIGHT: 'text-yellow-400'
    };
    return colors[element] || 'text-gray-400';
  };

  const getElementIcon = (element) => {
    const icons = {
      FIRE: '🔥',
      ICE: '❄️',
      EARTH: '🌍',
      DARK: '🌙',
      LIGHT: '☀️'
    };
    return icons[element] || '⚡';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`hero-tooltip p-3 rounded-xl shadow-2xl text-xs w-60 backdrop-blur-sm border-2 ${
        theme === 'dark' 
          ? 'bg-gray-900/95 border-blue-500/30 shadow-blue-500/20 text-white' 
          : 'bg-white/95 border-purple-500/30 shadow-purple-500/20 text-gray-900'
      }`}
      style={{ 
        pointerEvents: "none",
        ...(position.right ? { transform: "translateX(-100%) translateY(-50%)" } : {})
      }}
    >
      {/* En-tête avec nom et rareté */}
      <div className="mb-2">
        <div className={`font-bold text-base bg-gradient-to-r ${getRarityColor(hero.rarity)} bg-clip-text text-transparent mb-1`}>
          {hero.name}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className={`px-1.5 py-0.5 rounded-full font-medium bg-gradient-to-r ${getRarityColor(hero.rarity)} text-white`}>
            <FaGem className="inline w-2 h-2 mr-0.5" />
            {t(hero.rarity?.toLowerCase(), language) || hero.rarity}
          </span>
          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
          } ${getElementColor(hero.element)}`}>
            {getElementIcon(hero.element)} {t(hero.element?.toLowerCase(), language) || hero.element}
          </span>
        </div>
      </div>

      {/* Statistiques avec icônes */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-red-500/20' : 'bg-red-50'
          }`}>
            <div className="flex items-center gap-1.5">
              <GiSwordWound className="text-red-500 w-3.5 h-3.5" />
              <div>
                <div className="text-xs text-gray-500">{t("attack", language) || "Attaque"}</div>
                <div className="font-bold text-red-500 text-xs">{hero.totalAttack || hero.attack || 0}</div>
              </div>
            </div>
          </div>

          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'
          }`}>
            <div className="flex items-center gap-1.5">
              <GiShield className="text-blue-500 w-3.5 h-3.5" />
              <div>
                <div className="text-xs text-gray-500">{t("defense", language) || "Défense"}</div>
                <div className="font-bold text-blue-500 text-xs">{hero.totalDefense || hero.defense || 0}</div>
              </div>
            </div>
          </div>

          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-green-500/20' : 'bg-green-50'
          }`}>
            <div className="flex items-center gap-1.5">
              <FaHeart className="text-green-500 w-3.5 h-3.5" />
              <div>
                <div className="text-xs text-gray-500">{t("health", language) || "PV"}</div>
                <div className="font-bold text-green-500 text-xs">{hero.totalHealth || hero.health || 0}</div>
              </div>
            </div>
          </div>

          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-50'
          }`}>
            <div className="flex items-center gap-1.5">
              <GiRunningNinja className="text-yellow-500 w-3.5 h-3.5" />
              <div>
                <div className="text-xs text-gray-500">{t("speed", language) || "Vitesse"}</div>
                <div className="font-bold text-yellow-500 text-xs">{hero.totalSpeed || hero.speed || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Niveau si disponible */}
        {hero.level && (
          <div className={`p-1.5 rounded-lg ${
            theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-50'
          }`}>
            <div className="flex items-center gap-1.5">
              <FaStar className="text-purple-500 w-3.5 h-3.5" />
              <div>
                <div className="text-xs text-gray-500">{t("level", language) || "Niveau"}</div>
                <div className="font-bold text-purple-500 text-xs">{hero.level}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
