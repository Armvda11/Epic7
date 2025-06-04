import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { 
  FaVolumeUp, 
  FaVolumeDown, 
  FaVolumeMute, 
  FaMusic, 
  FaMagic,
  FaCog 
} from 'react-icons/fa';

/**
 * Composant de contrôle du volume pour la musique et les sons de héros
 * Utilisable pendant les combats pour ajuster les volumes en temps réel
 */
const VolumeControl = ({ 
  isVisible = true, 
  position = 'bottom-right',
  showLabels = true,
  onVolumeChange = null,
  className = ''
}) => {
  const { 
    theme, 
    musicVolume, 
    heroSoundsVolume, 
    updateMusicVolume, 
    updateHeroSoundsVolume 
  } = useSettings();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(null);

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  // Gestion du drag pour les sliders
  const handleMouseDown = (type) => {
    setIsDragging(type);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(null);
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const slider = e.target.closest('[data-slider]');
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      const percentage = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      
      if (isDragging === 'music') {
        updateMusicVolume(percentage);
        if (onVolumeChange) onVolumeChange('music', percentage);
      } else if (isDragging === 'hero') {
        updateHeroSoundsVolume(percentage);
        if (onVolumeChange) onVolumeChange('hero', percentage);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateMusicVolume, updateHeroSoundsVolume, onVolumeChange]);

  // Icône de volume selon le niveau
  const getVolumeIcon = (volume) => {
    if (volume === 0) return <FaVolumeMute size={16} />;
    if (volume < 0.5) return <FaVolumeDown size={16} />;
    return <FaVolumeUp size={16} />;
  };

  // Couleur selon le volume
  const getVolumeColor = (volume) => {
    if (volume === 0) return 'text-red-400';
    if (volume < 0.3) return 'text-yellow-400';
    if (volume < 0.7) return 'text-blue-400';
    return 'text-green-400';
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed z-50 ${positionClasses[position]} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className={`relative backdrop-blur-md ${
        theme === 'dark' 
          ? 'bg-black/60 border-white/20' 
          : 'bg-white/60 border-gray-300/40'
      } border rounded-xl shadow-2xl overflow-hidden`}>
        
        {/* Bouton principal pour déplier/replier */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-3 w-full flex items-center justify-center transition-all duration-300 ${
            theme === 'dark' 
              ? 'hover:bg-white/10 text-white' 
              : 'hover:bg-gray-100/60 text-gray-800'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <FaCog size={20} />
          </motion.div>
        </motion.button>

        {/* Panneau étendu des contrôles */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`overflow-hidden border-t ${
                theme === 'dark' ? 'border-white/20' : 'border-gray-300/40'
              }`}
            >
              <div className="p-4 space-y-4 w-64">
                
                {/* Contrôle volume musique */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FaMusic className="text-purple-400" size={14} />
                      {showLabels && (
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          Musique
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center space-x-1 ${getVolumeColor(musicVolume)}`}>
                      {getVolumeIcon(musicVolume)}
                      <span className="text-xs font-mono">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Slider musique */}
                  <div 
                    data-slider
                    className={`relative h-2 rounded-full cursor-pointer ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                    onMouseDown={() => handleMouseDown('music')}
                  >
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      style={{ width: `${musicVolume * 100}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${musicVolume * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing border-2 border-purple-500"
                      style={{ left: `calc(${musicVolume * 100}% - 8px)` }}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 1.1 }}
                    />
                  </div>
                </div>

                {/* Contrôle volume sons de héros */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FaMagic className="text-orange-400" size={14} />
                      {showLabels && (
                        <span className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          Héros
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center space-x-1 ${getVolumeColor(heroSoundsVolume)}`}>
                      {getVolumeIcon(heroSoundsVolume)}
                      <span className="text-xs font-mono">
                        {Math.round(heroSoundsVolume * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Slider sons de héros */}
                  <div 
                    data-slider
                    className={`relative h-2 rounded-full cursor-pointer ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                    onMouseDown={() => handleMouseDown('hero')}
                  >
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                      style={{ width: `${heroSoundsVolume * 100}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${heroSoundsVolume * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing border-2 border-orange-500"
                      style={{ left: `calc(${heroSoundsVolume * 100}% - 8px)` }}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 1.1 }}
                    />
                  </div>
                </div>

                {/* Boutons de préréglages */}
                <div className="flex space-x-2 pt-2">
                  <motion.button
                    onClick={() => {
                      updateMusicVolume(0);
                      updateHeroSoundsVolume(0);
                    }}
                    className={`flex-1 py-1 px-2 text-xs rounded-lg transition-all ${
                      theme === 'dark' 
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30' 
                        : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Muet
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      updateMusicVolume(0.5);
                      updateHeroSoundsVolume(0.5);
                    }}
                    className={`flex-1 py-1 px-2 text-xs rounded-lg transition-all ${
                      theme === 'dark' 
                        ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30' 
                        : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    50%
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      updateMusicVolume(1);
                      updateHeroSoundsVolume(1);
                    }}
                    className={`flex-1 py-1 px-2 text-xs rounded-lg transition-all ${
                      theme === 'dark' 
                        ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30' 
                        : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Max
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default VolumeControl;
