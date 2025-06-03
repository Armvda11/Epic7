import React from 'react';
import { motion } from 'framer-motion';

export default function AttackEffect({ x, y, type = 'slash', isVisible, onAnimationEnd }) {
  if (!isVisible) return null;

  const effects = {
    slash: {
      elements: [
        { icon: '⚔️', delay: 0, color: 'text-red-400' },
        { icon: '💨', delay: 0.1, color: 'text-gray-300' },
        { icon: '✨', delay: 0.2, color: 'text-yellow-400' }
      ],
      animation: {
        initial: { scale: 0, rotate: -45, opacity: 0 },
        animate: { scale: [0, 1.8, 0], rotate: [45, 135, 225], opacity: [0, 1, 0] },
        transition: { duration: 0.8, ease: 'easeOut' }
      }
    },
    impact: {
      elements: [
        { icon: '💥', delay: 0, color: 'text-orange-400' },
        { icon: '⭐', delay: 0.1, color: 'text-yellow-300' },
        { icon: '🔥', delay: 0.2, color: 'text-red-500' }
      ],
      animation: {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: [0, 2.5, 0], opacity: [0, 1, 0] },
        transition: { duration: 0.7, ease: 'easeOut' }
      }
    },
    magic: {
      elements: [
        { icon: '✨', delay: 0, color: 'text-purple-400' },
        { icon: '🌟', delay: 0.1, color: 'text-blue-300' },
        { icon: '💫', delay: 0.2, color: 'text-indigo-400' },
        { icon: '⚡', delay: 0.3, color: 'text-cyan-300' }
      ],
      animation: {
        initial: { scale: 0, rotate: 0, opacity: 0 },
        animate: { scale: [0, 2, 0], rotate: [0, 720], opacity: [0, 1, 0] },
        transition: { duration: 1.2, ease: 'easeOut' }
      }
    },
    heal: {
      elements: [
        { icon: '💚', delay: 0, color: 'text-green-400' },
        { icon: '✨', delay: 0.1, color: 'text-emerald-300' },
        { icon: '🌿', delay: 0.2, color: 'text-green-500' }
      ],
      animation: {
        initial: { scale: 0, y: 20, opacity: 0 },
        animate: { scale: [0, 1.8, 0], y: [20, -50, -80], opacity: [0, 1, 0] },
        transition: { duration: 1.2, ease: 'easeOut' }
      }
    }
  };

  const effect = effects[type] || effects.impact;

  return (
    <div className="absolute pointer-events-none" style={{ top: y - 40, left: x - 40, zIndex: 60 }}>
      {effect.elements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute text-6xl ${element.color} drop-shadow-2xl`}
          style={{
            textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
            left: index * 5, // Léger décalage pour chaque élément
            top: index * 3
          }}
          initial={effect.animation.initial}
          animate={effect.animation.animate}
          transition={{
            ...effect.animation.transition,
            delay: element.delay
          }}
          onAnimationComplete={index === 0 ? onAnimationEnd : undefined} // Callback seulement sur le premier élément
        >
          {element.icon}
        </motion.div>
      ))}
      
      {/* Onde de choc pour les gros impacts */}
      {(type === 'impact' || type === 'magic') && (
        <motion.div
          className="absolute w-20 h-20 rounded-full border-4 border-white/50"
          style={{ left: -40, top: -40 }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
