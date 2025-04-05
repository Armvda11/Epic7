// src/components/battleSelection/DraggableHero.jsx
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import HeroTooltip from './HeroTooltip';
import { heroImg } from '../../heroUtils';

export default function DraggableHero({ hero }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hero-${hero.id}`,
    data: { hero },
  });

  const [showTooltip, setShowTooltip] = useState(false);

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-700 hover:ring-2 hover:ring-indigo-500 transition">
        <img src={heroImg(hero.name)} alt={hero.name} className="object-cover w-full h-full" />
      </div>
      {showTooltip && <HeroTooltip hero={hero} />}
    </div>
  );
}
