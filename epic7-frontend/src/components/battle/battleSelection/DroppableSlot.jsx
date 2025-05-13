// src/components/battleSelection/DroppableSlot.jsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { heroImg } from '../../heroUtils';

export default function DroppableSlot({ slotId, hero, onRemove, isAlly = false, isEnemy = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotId}` });

  // Détermine les couleurs de bordure en fonction du type de slot (allié/ennemi)
  const getBorderColor = () => {
    if (isOver) return 'border-blue-400 bg-blue-900/20 scale-105';
    if (isAlly) return hero ? 'border-green-500' : 'border-dashed border-green-500/50';
    if (isEnemy) return hero ? 'border-red-500' : 'border-dashed border-red-500/50';
    return 'border-dashed border-gray-500';
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative w-24 h-24 rounded-xl border-4 flex items-center justify-center bg-black/30 transition-all duration-200 
        ${getBorderColor()}`}
    >
      {hero ? (
        <>
          <div className="relative w-full h-full">
            <img
              src={heroImg(hero.name)}
              alt={hero.name}
              className={`object-cover w-full h-full rounded-xl shadow-xl ${isEnemy ? 'grayscale-[15%] brightness-90' : ''}`}
            />
            
            {/* Badge indiquant le type de héros */}
            {isAlly && (
              <div className="absolute top-1 left-1 bg-green-600/70 text-white text-xs px-1.5 py-0.5 rounded-br-lg z-10">
                Allié
              </div>
            )}
            {isEnemy && (
              <div className="absolute top-1 left-1 bg-red-600/70 text-white text-xs px-1.5 py-0.5 rounded-br-lg z-10">
                Ennemi
              </div>
            )}
            
            <button
              onClick={() => onRemove(slotId, hero)}
              className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white text-xs px-1 py-0.5 rounded-bl-lg z-10"
            >
              ✖
            </button>
          </div>
        </>
      ) : (
        <span className={`text-sm font-bold ${isAlly ? 'text-green-400' : isEnemy ? 'text-red-400' : 'text-gray-400'}`}>
          {isAlly ? 'Allié' : isEnemy ? 'Ennemi' : `Slot ${slotId + 1}`}
        </span>
      )}
    </div>
  );
}
