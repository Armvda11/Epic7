// src/components/ui/MusicController.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp, FaVolumeDown, FaVolumeMute, FaMusic, FaPause, FaPlay } from 'react-icons/fa';
import { useMusic } from '../../context/MusicContext';
import { useSettings } from '../../context/SettingsContext';

export default function MusicController({ className = "" }) {
  const { theme } = useSettings();
  const {
    setVolume,
    pauseMusic,
    resumeMusic,
    isMusicPaused,
    currentTrack
  } = useMusic();

  const [volume, setVolumeState] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Synchroniser l'état de pause avec l'audio réel
  useEffect(() => {
    const checkPauseState = () => {
      setIsPaused(isMusicPaused());
    };
    
    // Vérifier l'état initial
    checkPauseState();
    
    // Vérifier périodiquement l'état
    const interval = setInterval(checkPauseState, 500);
    
    return () => clearInterval(interval);
  }, [isMusicPaused, currentTrack]);

  // Gérer le changement de volume
  const handleVolumeChange = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    setVolume(clampedVolume);
    
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [setVolume, isMuted]);

  // Basculer muet/non muet
  const toggleMute = useCallback(() => {
    if (isMuted) {
      handleVolumeChange(0.3); // Volume par défaut
    } else {
      handleVolumeChange(0);
    }
  }, [isMuted, handleVolumeChange]);

  // Basculer pause/lecture
  const togglePlayPause = useCallback(() => {
    console.log('État de pause actuel:', isPaused);
    if (isPaused) {
      console.log('Tentative de reprise...');
      resumeMusic();
    } else {
      console.log('Tentative de pause...');
      pauseMusic();
    }
    // Force update de l'état local pour une réponse immédiate
    setIsPaused(!isPaused);
  }, [isPaused, pauseMusic, resumeMusic]);

  // Obtenir l'icône de volume appropriée
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return FaVolumeMute;
    if (volume < 0.5) return FaVolumeDown;
    return FaVolumeUp;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <motion.div
      className={`fixed bottom-4 right-4 z-50 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`backdrop-blur-md rounded-xl border transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-black/40 border-white/20 text-white'
            : 'bg-white/40 border-white/60 text-gray-800'
        } ${isExpanded ? 'p-4' : 'p-3'}`}
        animate={{ 
          width: isExpanded ? 'auto' : '60px',
          height: isExpanded ? 'auto' : '60px'
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {!isExpanded ? (
          // Vue compacte - juste l'icône de musique
          <motion.button
            onClick={() => setIsExpanded(true)}
            className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaMusic className="w-6 h-6" />
          </motion.button>
        ) : (
          // Vue étendue - contrôles complets
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col space-y-3 min-w-[200px]"
          >
            {/* Header avec titre et bouton fermer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaMusic className="w-4 h-4" />
                <span className="text-sm font-medium">Musique</span>
              </div>
              <motion.button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xs">×</span>
              </motion.button>
            </div>

            {/* Piste actuelle */}
            {currentTrack && (
              <div className="text-xs text-center py-2 px-3 rounded-lg bg-white/10">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="capitalize">
                    {currentTrack === 'dashboard' && 'Dashboard'}
                    {currentTrack === 'rtaSelection' && 'Sélection RTA'}
                    {currentTrack === 'rtaBattle' && 'Combat RTA'}
                    {currentTrack === 'bossBattle' && 'Combat Boss'}
                    {currentTrack === 'connection' && 'Connexion'}
                  </span>
                </div>
              </div>
            )}

            {/* Contrôles de lecture */}
            <div className="flex items-center justify-center space-x-4">
              <motion.button
                onClick={togglePlayPause}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!currentTrack}
              >
                {isPaused ? (
                  <FaPlay className="w-4 h-4 ml-0.5" />
                ) : (
                  <FaPause className="w-4 h-4" />
                )}
              </motion.button>

              <motion.button
                onClick={toggleMute}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <VolumeIcon className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Slider de volume */}
            <div className="flex items-center space-x-3">
              <FaVolumeDown className="w-3 h-3 opacity-60" />
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-white/20 slider-thumb-dark'
                      : 'bg-gray-300 slider-thumb-light'
                  }`}
                  style={{
                    background: `linear-gradient(to right, ${
                      theme === 'dark' ? '#3b82f6' : '#6366f1'
                    } 0%, ${
                      theme === 'dark' ? '#3b82f6' : '#6366f1'
                    } ${volume * 100}%, ${
                      theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                    } ${volume * 100}%, ${
                      theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                    } 100%)`
                  }}
                />
              </div>
              <FaVolumeUp className="w-3 h-3 opacity-60" />
            </div>

            {/* Indicateur de volume */}
            <div className="text-center">
              <span className="text-xs opacity-60">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Styles CSS pour le slider */}
      <style jsx>{`
        .slider-thumb-dark::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
        
        .slider-thumb-light::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
        }
        
        .slider-thumb-dark::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }
        
        .slider-thumb-light::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </motion.div>
  );
}
