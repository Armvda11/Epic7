import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function FloatingDamage({ value, x, y, type = 'DAMAGE', isCritical: forceCritical, onAnimationEnd }) {
  // Couleur & ombre en fonction du type
  const baseColor = type === 'HEAL' ? 'text-green-400' : 'text-red-500';
  const baseShadow = type === 'HEAL' ? 'drop-shadow-md' : 'drop-shadow-2xl';

  // Dynamique : scale, taille, effet si gros dégâts
  const isBigHit = value > 200;
  const isCritHit = forceCritical || value > 1500;

  const size = isCritHit ? 'text-5xl' : isBigHit ? 'text-4xl' : 'text-2xl';
  const scale = isCritHit ? 1.8 : isBigHit ? 1.5 : 1.2;

  const extraStyle = isCritHit
    ? 'text-red-300 animate-bounce'
    : isBigHit
    ? 'text-orange-400'
    : '';

  // Auto-suppression après l'animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAnimationEnd) onAnimationEnd();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -80, scale }}
      transition={{ duration: 2, ease: 'easeOut' }}
      className={`absolute pointer-events-none font-extrabold ${size} ${baseColor} ${baseShadow} ${extraStyle}`}
      style={{ 
        top: y, 
        left: x - 60, // Centrer le texte
        zIndex: 50,
        textShadow: type === 'HEAL' 
          ? '0 0 10px rgba(74, 222, 128, 0.8)' 
          : '0 0 15px rgba(239, 68, 68, 0.9)'
      }}
    >
      {type === 'HEAL' ? `+${value}` : `-${value}`}
      {isCritHit && (
        <motion.span
          className="absolute -top-2 -right-2 text-yellow-400 text-lg"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.5, repeat: 3 }}
        >
          ⭐
        </motion.span>
      )}
    </motion.div>
  );
}
