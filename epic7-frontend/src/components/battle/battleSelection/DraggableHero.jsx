// src/components/battleSelection/DraggableHero.jsx
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import HeroTooltip from './HeroTooltip';
import { heroImgBattle } from '../../heroUtils';
import { useSettings } from '../../../context/SettingsContext';
import { FaStar, FaGem } from 'react-icons/fa';

export default function DraggableHero({ hero }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hero-${hero.id}`,
    data: { hero },
  });

  const [showTooltip, setShowTooltip] = useState(false);
  const { theme } = useSettings();

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // Couleurs selon la rareté
  const getRarityGlow = (rarity) => {
    switch(rarity) {
      case 'LEGENDARY':
        return 'shadow-yellow-400/50 ring-yellow-400/30';
      case 'EPIC':
        return 'shadow-purple-400/50 ring-purple-400/30';
      case 'RARE':
        return 'shadow-blue-400/50 ring-blue-400/30';
      default:
        return 'shadow-gray-400/50 ring-gray-400/30';
    }
  };

  // Icône selon la rareté
  const getRarityIcon = (rarity) => {
    switch(rarity) {
      case 'LEGENDARY':
        return <FaGem className="w-3 h-3 text-yellow-400" />;
      case 'EPIC':
        return <FaStar className="w-3 h-3 text-purple-400" />;
      case 'RARE':
        return <FaStar className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  // Couleur de l'élément
  const getElementColor = (element) => {
    const colors = {
      FIRE: 'bg-red-500/80',
      ICE: 'bg-blue-400/80',
      EARTH: 'bg-green-500/80',
      DARK: 'bg-purple-600/80',
      LIGHT: 'bg-yellow-400/80'
    };
    return colors[element] || 'bg-gray-500/80';
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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div 
        className={`relative w-20 h-20 rounded-xl overflow-hidden backdrop-blur-sm border-2 transition-all duration-300 ${
          isDragging 
            ? 'border-blue-400 shadow-xl shadow-blue-400/30' 
            : `border-white/20 hover:border-white/40 hover:shadow-lg ${getRarityGlow(hero.rarity)}`
        } ${theme === 'dark' ? 'bg-white/5' : 'bg-white/20'}`}
        animate={isDragging ? { 
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.5, repeat: Infinity }
        } : {}}
      >
        {/* Image du héros */}
        <img 
          src={heroImgBattle(hero.name)} 
          alt={hero.name} 
          className="object-cover w-full h-full transition-transform duration-300 hover:scale-110" 
        />
        
        {/* Overlay avec dégradé */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badge d'élément */}
        <motion.div
          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-xs font-bold text-white shadow-sm ${getElementColor(hero.element)}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-0.5">
            <span className="text-xs">{getElementIcon(hero.element)}</span>
          </div>
        </motion.div>

        {/* Badge de rareté */}
        {hero.rarity !== 'COMMON' && (
          <motion.div
            className="absolute top-1 right-1 p-1 rounded-md bg-black/50 backdrop-blur-sm"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {getRarityIcon(hero.rarity)}
          </motion.div>
        )}

        {/* Niveau du héros (si disponible) */}
        {hero.level && (
          <motion.div
            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-xs font-bold backdrop-blur-sm"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Lv.{hero.level}
          </motion.div>
        )}

        {/* Effet de glissement lors du drag */}
        {isDragging && (
          <motion.div
            className="absolute inset-0 bg-blue-400/20 rounded-xl"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Effet de lueur lors du survol */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className={`absolute inset-0 rounded-xl bg-white/10 shadow-inner`} />
        </motion.div>
      </motion.div>

      {/* Tooltip moderne avec position améliorée */}
      {showTooltip && !isDragging && (
        <div className="hero-tooltip-container" style={{ 
          left: "calc(100% + 5px)", 
          top: "50%", 
          transform: "translateY(-50%)"
        }}>
          <HeroTooltip hero={hero} />
        </div>
      )}
    </motion.div>
  );
}
