import React from 'react';
import { heroImgBattle, heroImgUnknownBattle } from '../heroUtils';

export default function TurnOrderBar({ participants, currentId, nextId }) {
  if (participants.length === 0) return null;

  const isPlayerSide = participants[0].player;
  const title = isPlayerSide ? "Ordre allié" : "Ordre ennemi";

  return (
    <div className="flex flex-col gap-2 bg-black/60 p-3 rounded-xl min-w-[180px] text-sm text-white shadow-lg backdrop-blur-md">
      <h3 className="text-center text-xs font-semibold uppercase tracking-wide text-gray-300 mb-1">
        {title}
      </h3>

      {participants.map((hero) => {
        const isCurrent = hero.id === currentId;
        const isNext = hero.id === nextId;

        return (
          <div
            key={hero.id}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300
              ${isCurrent ? 'bg-blue-500/80 text-white font-bold animate-glow' : 'bg-gray-800/70 text-gray-200'}
            `}
          >
            {/* Glow autour de l'image si current */}
            <div className={`relative w-8 h-8 rounded-full ${isCurrent ? 'shadow-glow' : ''}`}>
              <img
                src={heroImgBattle(hero.name)}
                alt={hero.name}
                className="w-8 h-8 object-contain rounded-full"
                onError={(e) => {
                  e.target.src = heroImgUnknownBattle();
                }}
              />
            </div>

            <span className="truncate max-w-[90px]">{hero.name}</span>

            {isNext && <div className="text-xl ml-auto">2️⃣</div>}
          </div>
        );
      })}
    </div>
  );
}
