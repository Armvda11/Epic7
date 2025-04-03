import React from 'react';

export default function BattleCombatLog({ logs }) {
  return (
    <div className="w-full h-full overflow-y-auto space-y-1 pr-2 text-sm">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-wide drop-shadow">
        📜 Journal de combat
      </h2>
      <ul className="space-y-2">
        {logs.map((log, idx) => (
          <li
            key={idx}
            className="bg-black/30 rounded-lg px-4 py-2 text-gray-200 border border-gray-700 shadow hover:bg-black/50 transition duration-200"
          >
            {log}
          </li>
        ))}
      </ul>
    </div>
  );
}