// src/components/battleSelection/HeroSelectionPanel.jsx
import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';

import DraggableHero from './DraggableHero';
import DroppableSlot from './DroppableSlot';
import { heroImgBattle } from '../../heroUtils';
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar } from '../../ui';
import { useSettings } from '../../../context/SettingsContext';
import { FaMagic, FaUsers, FaFilter, FaPlay, FaArrowLeft, FaSearch, FaGem, FaBolt } from 'react-icons/fa';
import { GiSwordWound, GiShield, GiCrossedSwords } from 'react-icons/gi';

export default function HeroSelectionPanel({ availableHeroes: initialHeroes, selectedHeroes, setSelectedHeroes, onStart, rtaMode = false }) {
  const [availableHeroes, setAvailableHeroes] = useState(initialHeroes);
  const [activeHero, setActiveHero] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [battleMode, setBattleMode] = useState('preparation');

  const { theme, t, language } = useSettings();
  
  const rarities = [...new Set(initialHeroes.map(h => h.rarity))].sort();
  const elements = [...new Set(initialHeroes.map(h => h.element))].sort();
  
  // Séparation des héros alliés (indices 0 et 1) et ennemis (indices 2 et 3)
  const allyHeroes = selectedHeroes.slice(0, 2);
  const enemyHeroes = selectedHeroes.slice(2, 4);

  // Animations variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  // Couleurs et icônes des éléments
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

  const getRarityColor = (rarity) => {
    const colors = {
      COMMON: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
      RARE: 'text-blue-500 bg-blue-100 dark:bg-blue-900',
      EPIC: 'text-purple-500 bg-purple-100 dark:bg-purple-900',
      LEGENDARY: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900'
    };
    return colors[rarity] || 'text-gray-500 bg-gray-100 dark:bg-gray-800';
  };

  const getElementColor = (element) => {
    const colors = {
      FIRE: 'text-red-500 bg-red-100 dark:bg-red-900',
      ICE: 'text-blue-400 bg-blue-100 dark:bg-blue-900',
      EARTH: 'text-green-500 bg-green-100 dark:bg-green-900',
      DARK: 'text-purple-600 bg-purple-100 dark:bg-purple-900',
      LIGHT: 'text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
    };
    return colors[element] || 'text-gray-500 bg-gray-100 dark:bg-gray-800';
  };

  

  useEffect(() => {
    setAvailableHeroes(initialHeroes.filter(h => !selectedHeroes.find(sel => sel?.id === h.id)));
  }, [initialHeroes, selectedHeroes]);

  const filteredHeroes = availableHeroes.filter(hero => {
    const nameMatch = hero.name.toLowerCase().includes(searchTerm.toLowerCase());
    const rarityMatch = selectedRarity ? hero.rarity === selectedRarity : true;
    const elementMatch = selectedElement ? hero.element === selectedElement : true;
    return nameMatch && rarityMatch && elementMatch;
  });

  const handleDragStart = (event) => {
    const hero = event.active.data.current?.hero;
    if (hero) setActiveHero(hero);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveHero(null);
    if (!active || !over) return;

    const draggedHero = active.data.current?.hero;
    const overId = over.id;

    if (overId.startsWith('slot-') && draggedHero) {
      const slotIndex = parseInt(overId.replace('slot-', ''));
      if (selectedHeroes.find(h => h?.id === draggedHero.id)) return;

      setSelectedHeroes(prev => {
        const updated = [...prev];
        updated[slotIndex] = draggedHero;
        return updated;
      });
    }
  };

  const handleRemoveHero = (slotIndex) => {
    setSelectedHeroes(prev => {
      const updated = [...prev];
      updated[slotIndex] = null;
      return updated;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRarity('');
    setSelectedElement('');
  };

  return (
    <ModernPageLayout
      title={rtaMode ? (t("rtaBattle", language) || "Combat RTA") : (t("battlePreparation", language) || "Préparation au Combat")}
      subtitle={rtaMode ? "Sélectionnez vos héros pour affronter un adversaire en ligne" : "Choisissez votre équipe pour affronter le boss"}
      showBackButton={true}
      backTo="/dashboard"
      showThemeToggle={true}
    >
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <motion.div 
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Section de recherche et filtres */}
          <motion.div variants={itemVariants}>
            <ModernCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <FaSearch className={`text-2xl ${theme === 'dark' ? 'text-blue-400' : 'text-purple-500'}`} />
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t("heroCollection", language) || "Collection de Héros"}
                </h2>
              </div>

              {/* Barre de recherche moderne */}
              <div className="mb-6">
                <ModernSearchBar
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("searchHeroes", language) || "Rechercher des héros..."}
                  className="w-full"
                />
              </div>

              {/* Filtres */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtre Élément */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t("element", language) || "Élément"}
                  </label>
                  <select
                    value={selectedElement}
                    onChange={(e) => setSelectedElement(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-white/60 border-white/40 text-gray-800'
                    }`}
                  >
                    <option value="">{t("allElements", language) || "Tous les éléments"}</option>
                    {elements.map(element => (
                      <option key={element} value={element}>
                        {getElementIcon(element)} {t(element?.toLowerCase(), language) || element}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtre Rareté */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t("rarity", language) || "Rareté"}
                  </label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                      theme === 'dark' 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-white/60 border-white/40 text-gray-800'
                    }`}
                  >
                    <option value="">{t("allRarities", language) || "Toutes les raretés"}</option>
                    {rarities.map(rarity => (
                      <option key={rarity} value={rarity}>
                        {t(rarity?.toLowerCase(), language) || rarity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton Reset */}
                <div className="flex items-end">
                  <ModernButton
                    variant="secondary"
                    onClick={resetFilters}
                    icon={<FaFilter />}
                    className="w-full"
                  >
                    {t("resetFilters", language) || "Réinitialiser"}
                  </ModernButton>
                </div>
              </div>
            </ModernCard>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Liste des héros disponibles */}
            <motion.div className="lg:col-span-1" variants={itemVariants}>
              <ModernCard className="p-6 h-[600px] overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <FaMagic className={`text-xl ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t("availableHeroes", language) || "Héros Disponibles"}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'
                  }`}>
                    {filteredHeroes.length}
                  </span>
                </div>

                <div className="overflow-y-auto h-[500px] space-y-3 pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {filteredHeroes.length > 0 ? (
                      filteredHeroes.map((hero, index) => (
                        <motion.div
                          key={hero.id}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          whileHover="hover"
                          custom={index}
                          className={`p-3 rounded-xl backdrop-blur-sm border transition-all duration-300 cursor-grab active:cursor-grabbing ${
                            theme === 'dark' 
                              ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20' 
                              : 'bg-white/40 border-white/30 hover:bg-white/60 hover:border-white/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <DraggableHero hero={hero} />
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {hero.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getElementColor(hero.element)}`}>
                                  {getElementIcon(hero.element)} {hero.element}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRarityColor(hero.rarity)}`}>
                                  {hero.rarity}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                      >
                        <FaSearch className={`mx-auto mb-4 text-4xl ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {t("noHeroesFound", language) || "Aucun héros ne correspond aux critères"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ModernCard>
            </motion.div>

            {/* Formation sélectionnée */}
            <motion.div className="lg:col-span-2" variants={itemVariants}>
              <ModernCard className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <GiCrossedSwords className={`text-2xl ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t("battleFormation", language) || "Formation de Combat"}
                  </h3>
                </div>

                <div className="space-y-8">
                  {/* Section Héros Alliés */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <GiShield className="text-xl text-green-500" />
                        <h4 className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                          {t("allyHeroes", language) || "Héros Alliés"}
                        </h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        theme === 'dark' ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-600'
                      }`}>
                        {allyHeroes.filter(Boolean).length}/2 {t("selected", language) || "sélectionné(s)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[0, 1].map((i) => (
                        <motion.div
                          key={i}
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          className="relative"
                        >
                          <DroppableSlot 
                            slotId={i} 
                            hero={selectedHeroes[i]} 
                            onRemove={handleRemoveHero} 
                            isAlly={true}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Informations RTA */}
                  {rtaMode && (
                    <motion.div 
                      variants={itemVariants}
                      className={`p-4 rounded-xl ${
                        theme === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FaBolt className="text-purple-500" />
                        <h5 className={`font-semibold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                          {t("rtaMode", language) || "Mode Combat RTA"}
                        </h5>
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-purple-200' : 'text-purple-600'}`}>
                        {t("rtaModeDescription", language) || "En mode combat en ligne (RTA), seuls vos héros alliés sont utilisés. Le système vous trouvera un adversaire réel avec ses propres héros."}
                      </p>
                    </motion.div>
                  )}

                  {/* Bouton de lancement du combat */}
                  <motion.div variants={itemVariants} className="pt-4">
                    <ModernButton
                      variant={rtaMode ? "primary" : "success"}
                      size="large"
                      onClick={onStart}
                      disabled={rtaMode 
                        ? allyHeroes.filter(Boolean).length < 2 
                        : allyHeroes.filter(Boolean).length < 1}
                      icon={<FaPlay />}
                      className="w-full py-4 text-lg font-bold"
                    >
                      {rtaMode 
                        ? allyHeroes.filter(Boolean).length === 2
                          ? (t("findOpponent", language) || "🔍 Rechercher un adversaire")
                          : `${t("selectAllyHeroes", language) || "Sélectionnez 2 héros alliés"} (${allyHeroes.filter(Boolean).length}/2)`
                        : allyHeroes.filter(Boolean).length > 0 
                          ? (t("startBattle", language) || "🚀 Lancer le Combat")
                          : (t("selectOneHero", language) || "Sélectionnez au moins 1 héros allié")}
                    </ModernButton>
                  </motion.div>
                </div>
              </ModernCard>
            </motion.div>
          </div>
        </motion.div>

        {/* Drag Overlay avec animation moderne */}
        <DragOverlay dropAnimation={null}>
          <AnimatePresence>
            {activeHero && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                animate={{ scale: 1.1, opacity: 1, rotate: 5 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`w-24 h-24 rounded-2xl overflow-hidden border-4 shadow-2xl ${
                  theme === 'dark' ? 'border-blue-400 shadow-blue-400/50' : 'border-purple-400 shadow-purple-400/50'
                }`}
              >
                <img
                  src={heroImgBattle(activeHero.name)}
                  alt={activeHero.name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-1 left-1 right-1 text-white text-xs font-bold truncate">
                  {activeHero.name}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DragOverlay>
      </DndContext>
    </ModernPageLayout>
  );
}
