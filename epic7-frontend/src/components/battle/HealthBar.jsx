import React from 'react';

export default function HealthBar({ current, max }) {
  const percent = Math.max(0, (current / max) * 100);
  const getColor = () => {
    if (percent > 50) return 'from-green-400 to-green-600';
    if (percent > 25) return 'from-yellow-400 to-yellow-600';
    return 'from-red-500 to-red-700';
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
