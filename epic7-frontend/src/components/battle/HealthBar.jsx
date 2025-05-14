import React from 'react';

export default function HealthBar({ current, max, isAlly = false, isEnemy = false }) {
  const percent = Math.max(0, (current / max) * 100);
  const getColor = () => {
    // Couleurs pour les alliés
    if (isAlly) {
      if (percent > 50) return 'from-green-400 to-green-600 shadow-sm shadow-green-300/50';
      if (percent > 25) return 'from-yellow-400 to-yellow-600';
      return 'from-red-500 to-red-700';
    } 
    // Couleurs pour les ennemis
    else if (isEnemy) {
      if (percent > 50) return 'from-blue-400 to-blue-600 shadow-sm shadow-blue-300/50';
      if (percent > 25) return 'from-purple-400 to-purple-600';
      return 'from-red-700 to-red-900';
    } 
    // Couleurs par défaut
    else {
      if (percent > 50) return 'from-green-400 to-green-600';
      if (percent > 25) return 'from-yellow-400 to-yellow-600';
      return 'from-red-500 to-red-700';
    }
  };

  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner mt-2 border border-gray-700">
      <div
        className={`h-full transition-all duration-300 ease-in-out bg-gradient-to-r ${getColor()}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
