import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

const heroImg = (name) => `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;

// Composant pour les boutons de filtre
function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
        active ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function HeroTooltip({ hero }) {
  return (
    <div className="absolute left-full top-0 ml-2 p-3 bg-black/80 text-white rounded-xl shadow-lg text-sm w-48 z-40 border border-indigo-500 animate-fade-in">
      <p className="font-bold text-indigo-300 mb-1">{hero.name}</p>
      <p className="text-gray-300">Rareté : <span className="font-semibold text-yellow-400">{hero.rarity}</span></p>
      <p className="text-gray-300">Élément : <span className="font-semibold text-blue-400">{hero.element}</span></p>
      <p className="text-gray-300">Attaque : {hero.totalAttack}</p>
      <p className="text-gray-300">Défense : {hero.totalDefense}</p>
      <p className="text-gray-300">PV : {hero.totalHealth}</p>
      <p className="text-gray-300">Vitesse : {hero.totalSpeed}</p>
    </div>
  );
}

function DraggableHero({ hero }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hero-${hero.id}`,
    data: { hero },
  });
  const [showTooltip, setShowTooltip] = useState(false);

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-700 hover:ring-2 hover:ring-indigo-500 transition">
        <img src={heroImg(hero.name)} alt={hero.name} className="object-cover w-full h-full" />
      </div>
      {showTooltip && <HeroTooltip hero={hero} />}
    </div>
  );
}

function DroppableSlot({ slotId, hero, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotId}` });

  return (
    <div
      ref={setNodeRef}
      className={`relative w-24 h-24 rounded-xl border-4 flex items-center justify-center bg-black/30 transition-all duration-200 
        ${isOver ? 'border-blue-400 bg-blue-900/20 scale-105' : 'border-dashed border-gray-500'}`}
    >
      {hero ? (
        <>
          <img
            src={heroImg(hero.name)}
            alt={hero.name}
            className="object-cover w-full h-full rounded-xl shadow-xl"
          />
          <button
            onClick={() => onRemove(slotId, hero)}
            className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-1 py-0.5 rounded-bl-lg z-10"
          >
            ✖
          </button>
        </>
      ) : (
        <span className="text-sm text-gray-400 font-bold">Slot {slotId + 1}</span>
      )}
    </div>
  );
}

export default function HeroSelectionDragAndDropPanel({ availableHeroes: initialHeroes, selectedHeroes, setSelectedHeroes, onStart }) {
  const [availableHeroes, setAvailableHeroes] = useState(initialHeroes);
  const [activeHero, setActiveHero] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Nouveaux états pour les filtres
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedElement, setSelectedElement] = useState('');

  // Extraction des raretés et éléments uniques disponibles
  const rarities = [...new Set(initialHeroes.map(h => h.rarity))].sort();
  const elements = [...new Set(initialHeroes.map(h => h.element))].sort();

  useEffect(() => {
    setAvailableHeroes(initialHeroes.filter(h => !selectedHeroes.find(sel => sel?.id === h.id)));
  }, [initialHeroes, selectedHeroes]);

  // Fonction de filtrage mise à jour pour inclure tous les filtres
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
      if (selectedHeroes.find(h => h?.id === draggedHero.id)) return; // empêche les doublons

      setSelectedHeroes(prev => {
        const updated = [...prev];
        updated[slotIndex] = draggedHero;
        return updated;
      });
    }
  };

  const handleRemoveHero = (slotIndex, hero) => {
    setSelectedHeroes(prev => {
      const updated = [...prev];
      updated[slotIndex] = null;
      return updated;
    });
  };
  
  // Fonction pour réinitialiser les filtres
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
        <div className="w-1/3 flex flex-col items-center gap-4">
          <h2 className="text-xl font-bold">🧙 Mes héros</h2>
          
          {/* Zone de recherche et filtres */}
          <div className="w-full space-y-3">
            <input
              type="text"
              placeholder="Rechercher un héros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 placeholder-gray-400 text-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            {/* Filtres par rareté */}
            <div className="w-full">
              <p className="text-sm text-gray-400 mb-1.5">Rareté :</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterButton 
                  active={selectedRarity === ''} 
                  onClick={() => setSelectedRarity('')}
                >
                  Tous
                </FilterButton>
                {rarities.map(rarity => (
                  <FilterButton 
                    key={rarity} 
                    active={selectedRarity === rarity} 
                    onClick={() => setSelectedRarity(rarity)}
                  >
                    {rarity}
                  </FilterButton>
                ))}
              </div>
            </div>
            
            {/* Filtres par élément */}
            <div className="w-full">
              <p className="text-sm text-gray-400 mb-1.5">Élément :</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterButton 
                  active={selectedElement === ''} 
                  onClick={() => setSelectedElement('')}
                >
                  Tous
                </FilterButton>
                {elements.map(element => (
                  <FilterButton 
                    key={element} 
                    active={selectedElement === element} 
                    onClick={() => setSelectedElement(element)}
                  >
                    {element}
                  </FilterButton>
                ))}
              </div>
            </div>
            
            {/* Bouton réinitialiser si des filtres sont actifs */}
            {(selectedRarity || selectedElement || searchTerm) && (
              <button
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-white underline transition-colors flex items-center gap-1"
              >
                <span>↺</span> Réinitialiser les filtres
              </button>
            )}
          </div>
          
          {/* Résultats */}
          <div className="flex flex-col gap-3 w-full h-[45vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {filteredHeroes.length > 0 ? (
              filteredHeroes.map(hero => (
                <div key={hero.id} className="flex items-center gap-3 px-2 relative">
                  <DraggableHero hero={hero} />
                  <p className="text-sm text-white font-medium truncate max-w-[7rem]">{hero.name}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                Aucun héros ne correspond aux critères
              </div>
            )}
          </div>
        </div>

        <div className="w-2/3 flex flex-col items-center gap-8">
          <h2 className="text-xl font-bold">🎯 Formation de combat</h2>
          <div className="grid grid-cols-2 gap-6">
            {[0, 1, 2, 3].map(i => (
              <DroppableSlot key={i} slotId={i} hero={selectedHeroes[i]} onRemove={handleRemoveHero} />
            ))}
          </div>

          <button
            onClick={onStart}
            disabled={selectedHeroes.filter(Boolean).length === 0}
            className={`mt-6 px-8 py-3 rounded-xl font-bold transition transform duration-300 ${
              selectedHeroes.filter(Boolean).length === 0
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-lg'
            }`}
          >
            🚀 Lancer le combat
          </button>
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
