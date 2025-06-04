// src/components/battleSelection/DroppableSlot.jsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { heroImg } from '../../heroUtils';
import { useSettings } from '../../../context/SettingsContext';
import { FaPlus, FaTimes, FaBolt } from 'react-icons/fa';
import { GiShield, GiSwordWound } from 'react-icons/gi';

export default function DroppableSlot({ slotId, hero, onRemove, isAlly = false, isEnemy = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotId}` });
  const { theme, t, language } = useSettings();

  // Détermine les styles en fonction du type de slot et du thème
  const getSlotStyles = () => {
    const baseClasses = "relative w-32 h-32 rounded-2xl border-3 flex items-center justify-center backdrop-blur-sm transition-all duration-300";
    
    if (isOver) {
      return `${baseClasses} ${
        theme === 'dark' 
          ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30' 
          : 'border-blue-500 bg-blue-100/60 shadow-lg shadow-blue-500/20'
      } scale-105 transform`;
    }
    
    if (hero) {
      if (isAlly) {
        return `${baseClasses} ${
          theme === 'dark' 
            ? 'border-green-400 bg-green-500/10 shadow-md shadow-green-500/20' 
            : 'border-green-500 bg-green-50/60 shadow-md shadow-green-500/20'
        }`;
      } else if (isEnemy) {
        return `${baseClasses} ${
          theme === 'dark' 
            ? 'border-red-400 bg-red-500/10 shadow-md shadow-red-500/20' 
            : 'border-red-500 bg-red-50/60 shadow-md shadow-red-500/20'
        }`;
      }
    } else {
      // Slot vide
      if (isAlly) {
        return `${baseClasses} border-dashed ${
          theme === 'dark' 
            ? 'border-green-400/50 bg-green-500/5 hover:bg-green-500/10' 
            : 'border-green-500/50 bg-green-50/30 hover:bg-green-50/50'
        }`;
      } else if (isEnemy) {
        return `${baseClasses} border-dashed ${
          theme === 'dark' 
            ? 'border-red-400/50 bg-red-500/5 hover:bg-red-500/10' 
            : 'border-red-500/50 bg-red-50/30 hover:bg-red-50/50'
        }`;
      }
    }
    
    return `${baseClasses} border-dashed ${
      theme === 'dark' 
        ? 'border-gray-400/50 bg-gray-500/5' 
        : 'border-gray-500/50 bg-gray-50/30'
    }`;
  };

  const heroVariants = {
    initial: { scale: 0.8, opacity: 0, rotateY: -90 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    exit: { 
      scale: 0.8, 
      opacity: 0, 
      rotateY: 90,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      className={getSlotStyles()}
      whileHover={{ scale: hero ? 1.05 : 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <AnimatePresence mode="wait">
        {hero ? (
          <motion.div
            key={hero.id}
            variants={heroVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full h-full group"
          >
            {/* Image du héros */}
            <div className="relative w-full h-full overflow-hidden rounded-xl">
              <img
                src={heroImg(hero.name)}
                alt={hero.name}
                className={`object-cover w-full h-full transition-all duration-300 ${
                  isEnemy ? 'grayscale-[15%] brightness-90' : ''
                } group-hover:scale-110`}
              />
              
              {/* Overlay avec dégradé */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Nom du héros */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-bold truncate drop-shadow-lg">
                  {hero.name}
                </p>
              </div>
            </div>

            {/* Badge type de héros */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold shadow-lg backdrop-blur-sm ${
                isAlly 
                  ? 'bg-green-500/80 text-white border border-green-300/30' 
                  : isEnemy 
                    ? 'bg-red-500/80 text-white border border-red-300/30'
                    : 'bg-gray-500/80 text-white border border-gray-300/30'
              }`}
            >
              <div className="flex items-center gap-1">
                {isAlly ? <GiShield className="w-3 h-3" /> : isEnemy ? <GiSwordWound className="w-3 h-3" /> : null}
                {isAlly ? (t("ally", language) || "Allié") : isEnemy ? (t("enemy", language) || "Ennemi") : "Neutre"}
              </div>
            </motion.div>

            {/* Bouton de suppression */}
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => onRemove(slotId)}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-red-300/30"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaTimes className="w-3 h-3" />
            </motion.button>

            {/* Effet de survol */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`absolute inset-0 rounded-xl ${
                isAlly 
                  ? 'bg-green-400/20 shadow-inner' 
                  : isEnemy 
                    ? 'bg-red-400/20 shadow-inner'
                    : 'bg-blue-400/20 shadow-inner'
              }`} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center w-full h-full p-4 text-center"
          >
            {/* Icône selon le type */}
            <motion.div
              className={`mb-2 p-3 rounded-full ${
                isAlly 
                  ? theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                  : isEnemy 
                    ? theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                    : theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}
              whileHover={{ scale: 1.1, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              {isAlly ? (
                <GiShield className="w-5 h-5" />
              ) : isEnemy ? (
                <GiSwordWound className="w-5 h-5" />
              ) : (
                <FaPlus className="w-4 h-4" />
              )}
            </motion.div>

            {/* Texte */}
            <span className={`text-xs font-semibold ${
              isAlly 
                ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                : isEnemy 
                  ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isAlly 
                ? (t("allySlot", language) || "Slot Allié")
                : isEnemy 
                  ? (t("enemySlot", language) || "Slot Ennemi")
                  : `${t("slot", language) || "Slot"} ${slotId + 1}`}
            </span>
            
            <span className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {t("dragHereToAdd", language) || "Glissez ici"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effet de glow lors du survol pour les slots vides */}
      {!hero && isOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 rounded-2xl ${
            theme === 'dark' 
              ? 'bg-blue-400/10 shadow-lg shadow-blue-400/30' 
              : 'bg-blue-500/10 shadow-lg shadow-blue-500/20'
          }`}
        />
      )}
    </motion.div>
  );
}
