// 📁 src/components/battle/CombatLogPanel.jsx

import React from "react";

export default function CombatLogPanel({ logs }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="w-full max-h-40 overflow-y-auto bg-gray-900 bg-opacity-80 rounded-md p-4 mt-4 text-sm text-white shadow-inner">
      <h2 className="text-lg font-semibold mb-2">📜 Journal du combat</h2>
      <ul className="space-y-1 list-disc list-inside">
        {logs.map((log, index) => (
          <li key={index}>
            {log.actorName === "Système" ? (
              <span className="text-green-400">{log.actionName}: {log.targetName}</span>
            ) : log.heal ? (
              <span className="text-blue-300">
                {log.actorName} utilise <strong>{log.actionName}</strong> sur {log.targetName} et soigne {Math.abs(log.damage)} PV.
              </span>
            ) : (
              <span className="text-red-300">
                {log.actorName} utilise <strong>{log.actionName}</strong> sur {log.targetName} et inflige {log.damage} d’égâts.
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}