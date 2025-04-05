// src/components/battleSelection/DroppableSlot.jsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { heroImg } from '../../heroUtils';

export default function DroppableSlot({ slotId, hero, onRemove }) {
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
