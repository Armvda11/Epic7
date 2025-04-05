import React from 'react';

export default function BattleCombatLog({ logs }) {
  return (
    <div className="w-full h-full overflow-y-auto px-4 py-3 bg-black/20 backdrop-blur-sm rounded-2xl border border-indigo-700/30 shadow-inner space-y-1 text-sm">
      <h2 className="text-3xl font-extrabold text-indigo-300 mb-4 tracking-wide drop-shadow-lg text-center border-b border-indigo-700 pb-2">
        📜 Journal de combat
      </h2>

      <ul className="space-y-3">
        {logs.map((log, idx) => (
          <li
            key={idx}
            className="bg-gradient-to-br from-black/50 via-gray-800 to-black/40 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 shadow-md hover:bg-black/60 transition duration-200 tracking-wide leading-snug font-mono"
          >
            {log}
          </li>
        ))}
      </ul>
    </div>
  );
}
