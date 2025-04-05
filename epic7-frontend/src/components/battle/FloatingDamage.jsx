import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingDamage({ value, x, y, type = 'DAMAGE' }) {
  // Couleur & ombre en fonction du type
  const baseColor = type === 'HEAL' ? 'text-green-400' : 'text-red-500';
  const baseShadow = type === 'HEAL' ? 'drop-shadow-md' : 'drop-shadow-2xl';

  // Dynamique : scale, taille, effet si gros dégâts
  const isBigHit = value > 200;
  const isCritHit = value > 1500;

  const size = isCritHit ? 'text-5xl' : isBigHit ? 'text-4xl' : 'text-2xl';
  const scale = isCritHit ? 1.8 : isBigHit ? 1.5 : 1.2;

  const extraStyle = isCritHit
    ? 'text-red-300 animate-bounce'
    : isBigHit
    ? 'text-orange-400'
    : '';

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -60, scale }}
      transition={{ duration: 2, ease: 'easeOut' }}
      className={`absolute pointer-events-none font-extrabold ${size} ${baseColor} ${baseShadow} ${extraStyle}`}
      style={{ top: y, left: x - 120, zIndex: 50 }}

    >
      {type === 'HEAL' ? `+${value}` : `-${value}`}
    </motion.div>
  );
}
