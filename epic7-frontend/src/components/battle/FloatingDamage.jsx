import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingDamage({ value, x, y, type = 'DAMAGE' }) {
  const color = type === 'HEAL' ? 'text-green-400' : 'text-red-500';
  const shadow = type === 'HEAL' ? 'drop-shadow-lg' : 'drop-shadow-xl';

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -40, scale: 1.3 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className={`absolute pointer-events-none font-extrabold text-xl ${color} ${shadow}`}
      style={{ top: y, left: x }}
    >
      {type === 'HEAL' ? `+${value}` : `-${value}`}
    </motion.div>
  );
}
