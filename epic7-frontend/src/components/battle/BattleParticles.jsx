import React from 'react';
import { motion } from 'framer-motion';

export default function BattleParticles({ x, y, type = 'damage', isVisible, onAnimationEnd, size = 'normal' }) {
  if (!isVisible) return null;

  const particleConfigs = {
    damage: {
      count: 8,
      colors: ['text-red-400', 'text-orange-400', 'text-yellow-400'],
      symbols: ['•', '★', '◆', '▲'],
      spread: 60
    },
    heal: {
      count: 6,
      colors: ['text-green-400', 'text-emerald-300', 'text-lime-400'],
      symbols: ['♦', '✦', '●', '◇'],
      spread: 40
    },
    magic: {
      count: 12,
      colors: ['text-purple-400', 'text-blue-400', 'text-indigo-400', 'text-cyan-400'],
      symbols: ['✧', '✦', '◊', '◈', '♦'],
      spread: 80
    },
    critical: {
      count: 15,
      colors: ['text-yellow-300', 'text-orange-400', 'text-red-400'],
      symbols: ['★', '✦', '◆', '▲', '♦'],
      spread: 100
    },
    // Effets spéciaux pour les attaques spéciales du boss
    special: {
      count: 20,
      colors: ['text-purple-500', 'text-red-500', 'text-yellow-400', 'text-blue-500'],
      symbols: ['★', '✧', '⚡', '✦', '⛔', '⚠️'],
      spread: 150
    }
  };

  const config = particleConfigs[type] || particleConfigs.damage;
  
  // Ajuster le nombre de particules et la diffusion en fonction de la taille
  const particleCount = size === 'large' ? config.count * 1.5 : config.count;
  const particleSpread = size === 'large' ? config.spread * 1.3 : config.spread;

  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * 2 * Math.PI;
    const spread = particleSpread;
    const distance = 30 + Math.random() * 40;
    
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      symbol: config.symbols[Math.floor(Math.random() * config.symbols.length)],
      delay: Math.random() * 0.3,
      duration: 0.8 + Math.random() * 0.4
    };
  });

  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: y, left: x, zIndex: 55 }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute ${particle.color}`}
          style={{ 
            textShadow: '0 0 10px currentColor',
            fontSize: size === 'large' ? '1.5rem' : (type === 'critical' || type === 'special' ? '1.2rem' : '1rem')
          }}
          initial={{ 
            x: 0, 
            y: 0, 
            scale: 0, 
            opacity: 1,
            rotate: 0
          }}
          animate={{ 
            x: particle.x, 
            y: particle.y, 
            scale: [0, 1.5, 0], 
            opacity: [1, 1, 0],
            rotate: 360
          }}
          transition={{ 
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut'
          }}
          onAnimationComplete={particle.id === 0 ? onAnimationEnd : undefined}
        >
          {particle.symbol}
        </motion.div>
      ))}
    </div>
  );
}
