import React from 'react';
import { motion } from 'framer-motion';

export default function AttackEffect({ x, y, type = 'slash', isVisible, targetX, targetY, beamColor, size = 'normal', onAnimationEnd }) {
  if (!isVisible) return null;

  // Effet de rayon reliant le boss à sa cible
  if (type === 'beam') {
    // Calculer l'angle et la distance entre le boss et la cible
    const dx = targetX - x;
    const dy = targetY - y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const beamColors = {
      'red': 'from-red-600 to-red-300',
      'blue': 'from-blue-600 to-blue-300',
      'purple': 'from-purple-600 to-purple-300',
      'green': 'from-green-600 to-green-300'
    };
    
    const colorClass = beamColors[beamColor] || 'from-yellow-500 to-orange-300';
    
    return (
      <div className="absolute pointer-events-none z-50" style={{ top: y, left: x }}>
        <motion.div 
          className={`absolute origin-left bg-gradient-to-r ${colorClass} rounded-full opacity-70`}
          style={{
            height: '12px',
            width: distance,
            rotate: angle,
            transformOrigin: 'left center',
            filter: 'blur(2px)'
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ 
            scaleX: [0, 1, 1, 0],
            opacity: [0, 0.8, 0.8, 0]
          }}
          transition={{ 
            duration: 1.2,
            times: [0, 0.2, 0.8, 1]
          }}
          onAnimationComplete={onAnimationEnd}
        />
        
        {/* Pulsations le long du rayon */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute h-4 w-4 rounded-full bg-${beamColor}-400`}
            style={{
              rotate: angle,
              filter: 'blur(1px)'
            }}
            initial={{ 
              x: 0,
              opacity: 0,
              scale: 1.5
            }}
            animate={{ 
              x: [0, distance],
              opacity: [0, 1, 0],
              scale: [1, 2, 1]
            }}
            transition={{ 
              duration: 1,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
    );
  }

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
  
  // Ajuster la taille des éléments en fonction du paramètre size
  const sizeMultiplier = size === 'large' ? 1.5 : 1;
  const textSize = size === 'large' ? 'text-7xl' : 'text-6xl';

  return (
    <div className="absolute pointer-events-none" style={{ top: y - 40, left: x - 40, zIndex: 60 }}>
      {effect.elements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute ${textSize} ${element.color} drop-shadow-2xl`}
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
          className={`absolute rounded-full border-4 ${
            type === 'magic' ? 'border-purple-400/50' : 'border-white/50'
          }`}
          style={{ 
            left: -40 * sizeMultiplier, 
            top: -40 * sizeMultiplier,
            width: 20 * sizeMultiplier,
            height: 20 * sizeMultiplier
          }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
      
      {/* Cercle de focus pour les attaques spéciales */}
      {size === 'large' && (
        <motion.div
          className="absolute w-32 h-32 rounded-full"
          style={{ 
            left: -64, 
            top: -64,
            background: `radial-gradient(circle, ${
              type === 'magic' ? 'rgba(147, 51, 234, 0.3)' : 
              type === 'slash' ? 'rgba(239, 68, 68, 0.3)' : 
              'rgba(249, 115, 22, 0.3)'
            } 0%, transparent 70%)`,
            filter: 'blur(2px)'
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2, opacity: [0, 0.8, 0] }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}
