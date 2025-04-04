import React from 'react';
import BattleHeroCard from './BattleHeroCard';

export default function HeroSelectionPanel({ availableHeroes, selectedHeroIds, onHeroClick, onStart, loading }) {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">Sélectionnez jusqu'à 4 héros</h1>
      
      <div className="flex flex-wrap justify-center gap-4 max-w-5xl">
        {availableHeroes.map(hero => (
          <div
            key={hero.id}
            className={`transition duration-200 transform ${selectedHeroIds.includes(hero.id)
              ? 'ring-4 ring-green-500 scale-105'
              : 'hover:scale-105'
              }`}
            onClick={() => onHeroClick(hero.id)}
          >
            <BattleHeroCard hero={hero} />
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        disabled={selectedHeroIds.length === 0 || loading}
        className={`mt-8 px-6 py-3 rounded-xl text-lg font-bold transition ${
          selectedHeroIds.length === 0 || loading
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading ? 'Chargement...' : 'Lancer le combat'}
      </button>
    </div>
  );
}
