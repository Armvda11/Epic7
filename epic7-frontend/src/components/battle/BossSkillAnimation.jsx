import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Composant pour afficher les animations d'attaque spéciales du boss
 */
export default function BossSkillAnimation({ bossCode, isVisible, onAnimationEnd }) {
  const [animationPhase, setAnimationPhase] = useState('entering'); // entering, playing, exiting
  const [showAnimation, setShowAnimation] = useState(false);

  // Déterminer le type d'effet visuel à afficher basé sur le boss
  const getBossEffectType = (bossCode) => {
    if (!bossCode) return 'generic';
    
    // Assignation d'un type d'effet basé sur le nom du boss
    const bossNameLower = bossCode.toLowerCase();
    if (bossNameLower.includes('dragon')) return 'fire';
    if (bossNameLower.includes('golem')) return 'earth';
    if (bossNameLower.includes('wyvern')) return 'ice';
    if (bossNameLower.includes('banshee')) return 'dark';
    return 'generic'; // Type par défaut
  };

  useEffect(() => {
    if (isVisible) {
      setShowAnimation(true);
      setAnimationPhase('entering');
      
      // Phase d'entrée (fade in + zoom)
      const enterTimer = setTimeout(() => {
        setAnimationPhase('playing');
      }, 300);

      // Phase de sortie après la durée de l'animation
      const exitTimer = setTimeout(() => {
        setAnimationPhase('exiting');
        
        // Fin complète après effet de sortie
        setTimeout(() => {
          setShowAnimation(false);
          if (onAnimationEnd) onAnimationEnd();
        }, 500);
      }, 2500);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(exitTimer);
      };
    } else {
      // Reset quand pas visible
      setShowAnimation(false);
      setAnimationPhase('entering');
    }
  }, [isVisible, onAnimationEnd]);

  if (!isVisible || !showAnimation) return null;

  const effectType = getBossEffectType(bossCode);
  
  // Classes CSS et styles basés sur la phase d'animation
  const getAnimationClasses = () => {
    const baseClasses = "fixed inset-0 flex items-center justify-center z-50 pointer-events-none";
    
    if (animationPhase === 'entering') return `${baseClasses} opacity-0 scale-95`;
    if (animationPhase === 'playing') return `${baseClasses} opacity-100 scale-100 transition-all duration-300`;
    if (animationPhase === 'exiting') return `${baseClasses} opacity-0 scale-105 transition-all duration-500`;
    
    return baseClasses;
  };

  // Couleurs et effets basés sur le type de boss
  const getEffectColors = () => {
    switch (effectType) {
      case 'fire':
        return {
          primary: 'from-red-600 to-orange-400',
          secondary: 'text-yellow-300',
          particles: 'bg-orange-500',
          glow: '0 0 20px rgba(234, 88, 12, 0.8)'
        };
      case 'ice':
        return {
          primary: 'from-blue-600 to-cyan-400',
          secondary: 'text-cyan-200',
          particles: 'bg-blue-400',
          glow: '0 0 20px rgba(59, 130, 246, 0.8)'
        };
      case 'earth':
        return {
          primary: 'from-green-600 to-lime-400',
          secondary: 'text-lime-200',
          particles: 'bg-green-500',
          glow: '0 0 20px rgba(22, 163, 74, 0.8)'
        };
      case 'dark':
        return {
          primary: 'from-purple-800 to-violet-500',
          secondary: 'text-purple-200',
          particles: 'bg-purple-500',
          glow: '0 0 20px rgba(147, 51, 234, 0.8)'
        };
      default:
        return {
          primary: 'from-gray-700 to-gray-500',
          secondary: 'text-gray-200',
          particles: 'bg-gray-400',
          glow: '0 0 20px rgba(107, 114, 128, 0.8)'
        };
    }
  };

  const colors = getEffectColors();

  return (
    <div className={getAnimationClasses()}>
      {/* Overlay sombre avec transparence */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Animation principale */}
      <motion.div 
        className={`relative z-10 w-[500px] h-[350px] rounded-xl overflow-hidden shadow-2xl border-4 border-${colors.secondary.split('-')[1]}-400 bg-gradient-to-br ${colors.primary} flex items-center justify-center`}
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 1, -1, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: 1,
          repeatType: 'reverse'
        }}
      >
        <div className="text-center">
          <motion.div 
            className={`text-7xl mb-6 ${colors.secondary}`}
            animate={{ 
              scale: [1, 1.5, 1],
              rotate: [0, 15, -15, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              repeatType: 'reverse'
            }}
            style={{ 
              textShadow: colors.glow
            }}
          >
            {effectType === 'fire' ? '🔥' : 
             effectType === 'ice' ? '❄️' : 
             effectType === 'earth' ? '🌿' : 
             effectType === 'dark' ? '🌑' : '⚔️'}
          </motion.div>
          
          <motion.div 
            className="text-2xl font-bold text-white mb-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {bossCode}
          </motion.div>
          
          <motion.div 
            className="text-lg text-white/90"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Attaque Spéciale
          </motion.div>
        </div>
        
        {/* Effets de particules */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-3 h-3 ${colors.particles} rounded-full`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 0.8, 0],
                x: [0, (Math.random() - 0.5) * 100],
                y: [0, (Math.random() - 0.5) * 100],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
