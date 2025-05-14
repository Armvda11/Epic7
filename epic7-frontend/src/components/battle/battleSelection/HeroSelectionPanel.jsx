// src/components/battleSelection/HeroSelectionPanel.jsx
import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';

import DraggableHero from './DraggableHero';
import DroppableSlot from './DroppableSlot';
import FilterControls from './FilterControls';
import { heroImg } from '../../heroUtils';

export default function HeroSelectionPanel({ availableHeroes: initialHeroes, selectedHeroes, setSelectedHeroes, onStart, rtaMode = false }) {
  const [availableHeroes, setAvailableHeroes] = useState(initialHeroes);
  const [activeHero, setActiveHero] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [battleMode, setBattleMode] = useState('preparation'); // 'preparation', 'battle'

  const rarities = [...new Set(initialHeroes.map(h => h.rarity))].sort();
  const elements = [...new Set(initialHeroes.map(h => h.element))].sort();
  
  // Séparation des héros alliés (indices 0 et 1) et ennemis (indices 2 et 3)
  const allyHeroes = selectedHeroes.slice(0, 2);
  const enemyHeroes = selectedHeroes.slice(2, 4);

  

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
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 flex flex-row gap-6 items-start justify-center overflow-hidden">
        {/* Héros disponibles */}
        <div className="w-1/3 flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold">🧙 Mes héros</h2>

          <FilterControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedRarity={selectedRarity}
            setSelectedRarity={setSelectedRarity}
            selectedElement={selectedElement}
            setSelectedElement={setSelectedElement}
            rarities={rarities}
            elements={elements}
            resetFilters={resetFilters}
          />

          <div className="flex flex-col gap-3 w-full h-[45vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {filteredHeroes.length > 0 ? (
              filteredHeroes.map(hero => (
                <div key={hero.id} className="flex items-center gap-3 px-2 relative">
                  <DraggableHero hero={hero} />
                  <p className="text-sm text-white font-medium truncate max-w-[7rem]">{hero.name}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">Aucun héros ne correspond aux critères</div>
            )}
          </div>
        </div>

        {/* Formation sélectionnée */}
        <div className="w-2/3 flex flex-col items-center gap-8">
          <h2 className="text-xl font-bold">⚔️ Champ de bataille</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 mb-2 relative">
              <h3 className="text-lg font-semibold text-green-400 mb-1">🛡️ Vos héros</h3>
              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(i => (
                  <DroppableSlot 
                    key={i} 
                    slotId={i} 
                    hero={selectedHeroes[i]} 
                    onRemove={handleRemoveHero} 
                    isAlly={true}
                  />
                ))}
              </div>
              
              {rtaMode && (
                <div className="absolute top-0 right-0 bg-green-600 text-white text-xs rounded px-2 py-0.5">
                  {allyHeroes.filter(Boolean).length}/2 sélectionnés
                </div>
              )}
            </div>
            
            {rtaMode && (
              <div className="col-span-2 mt-4 relative">
                <h3 className="text-lg font-semibold text-red-400 mb-1">⚔️ Héros adverses (simulation)</h3>
                <p className="text-xs text-gray-400 mb-2">
                  Pour tester votre équipe contre différentes combinaisons d'adversaires.
                  Ces héros ne seront pas utilisés dans le vrai combat RTA.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[2, 3].map(i => (
                    <DroppableSlot 
                      key={i} 
                      slotId={i} 
                      hero={selectedHeroes[i]} 
                      onRemove={handleRemoveHero} 
                      isEnemy={true}
                    />
                  ))}
                </div>
                
                <div className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded px-2 py-0.5">
                  {enemyHeroes.filter(Boolean).length}/2 sélectionnés
                </div>
              </div>
            )}
            
            {!rtaMode && (
              <div className="col-span-2 mt-4 relative">
                <h3 className="text-lg font-semibold text-red-400 mb-1">⚔️ Héros adverses</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[2, 3].map(i => (
                    <DroppableSlot 
                      key={i} 
                      slotId={i} 
                      hero={selectedHeroes[i]} 
                      onRemove={handleRemoveHero} 
                      isEnemy={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onStart}
            disabled={rtaMode 
              ? allyHeroes.filter(Boolean).length < 2 
              : allyHeroes.filter(Boolean).length < 1}
            className={`mt-6 px-8 py-3 rounded-xl font-bold transition transform duration-300 ${
              (rtaMode && allyHeroes.filter(Boolean).length < 2) || 
              (!rtaMode && allyHeroes.filter(Boolean).length < 1)
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : rtaMode 
                  ? 'bg-purple-600 hover:bg-purple-700 hover:scale-105 shadow-lg'
                  : 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-lg'
            }`}
          >
            {rtaMode 
              ? allyHeroes.filter(Boolean).length === 2
                ? '🔍 Rechercher un adversaire en ligne' 
                : `🔍 Sélectionnez 2 héros alliés (${allyHeroes.filter(Boolean).length}/2)`
              : allyHeroes.filter(Boolean).length > 0 
                ? '🚀 Lancer le combat' 
                : '🚀 Sélectionnez au moins 1 héros allié'}
          </button>
          
          {rtaMode && (
            <p className="text-sm text-gray-400 mt-2 text-center">
              En mode combat en ligne (RTA), seuls vos héros alliés sont utilisés.
              <br/>Le système vous trouvera un adversaire réel avec ses propres héros.
            </p>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeHero && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-xl"
            >
              <img
                src={heroImg(activeHero.name)}
                alt={activeHero.name}
                className="object-cover w-full h-full"
              />
            </motion.div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
