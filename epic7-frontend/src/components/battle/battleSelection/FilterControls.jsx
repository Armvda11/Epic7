// src/components/battleSelection/FilterControls.jsx
import React from 'react';
import FilterButton from './FilterButton';

export default function FilterControls({
  searchTerm,
  setSearchTerm,
  selectedRarity,
  setSelectedRarity,
  selectedElement,
  setSelectedElement,
  rarities,
  elements,
  resetFilters
}) {
  return (
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
          <FilterButton active={selectedRarity === ''} onClick={() => setSelectedRarity('')}>Tous</FilterButton>
          {rarities.map(rarity => (
            <FilterButton key={rarity} active={selectedRarity === rarity} onClick={() => setSelectedRarity(rarity)}>
              {rarity}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Filtres par élément */}
      <div className="w-full">
        <p className="text-sm text-gray-400 mb-1.5">Élément :</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterButton active={selectedElement === ''} onClick={() => setSelectedElement('')}>Tous</FilterButton>
          {elements.map(element => (
            <FilterButton key={element} active={selectedElement === element} onClick={() => setSelectedElement(element)}>
              {element}
            </FilterButton>
          ))}
        </div>
      </div>

      {(selectedRarity || selectedElement || searchTerm) && (
        <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-white underline transition-colors flex items-center gap-1">
          <span>↺</span> Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
