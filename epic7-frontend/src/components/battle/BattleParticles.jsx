import React from 'react';
import { motion } from 'framer-motion';

export default function BattleParticles({ x, y, type = 'damage', isVisible, onAnimationEnd }) {
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
    }
  };

  const config = particleConfigs[type] || particleConfigs.damage;

  const particles = Array.from({ length: config.count }, (_, i) => {
    const angle = (i / config.count) * 2 * Math.PI;
    const spread = config.spread;
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
          className={`absolute text-lg ${particle.color}`}
          style={{ 
            textShadow: '0 0 10px currentColor',
            fontSize: type === 'critical' ? '1.2rem' : '1rem'
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
