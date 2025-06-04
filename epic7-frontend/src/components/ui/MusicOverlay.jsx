// src/components/ui/MusicOverlay.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMusic, FaVolumeUp } from 'react-icons/fa';
import { useMusic } from '../../context/MusicContext';
import { useSettings } from '../../context/SettingsContext';

/**
 * Overlay discret qui affiche brièvement les informations sur la musique
 * quand une nouvelle piste commence à jouer
 */
export default function MusicOverlay() {
  const { theme } = useSettings();
  const { currentTrack } = useMusic();
  const [isVisible, setIsVisible] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);

  // Mapping des noms de pistes aux informations d'affichage
  const trackInfoMap = {
    dashboard: {
      title: 'Musique du Dashboard',
      artist: 'Epic7 OST',
      icon: '🏠',
      color: 'from-blue-500 to-purple-500'
    },
    rtaSelection: {
      title: 'Sélection RTA',
      artist: 'Epic7 Battle Music',
      icon: '⚔️',
      color: 'from-orange-500 to-red-500'
    },
    rtaBattle: {
      title: 'Combat RTA',
      artist: 'Epic7 Arena',
      icon: '🥊',
      color: 'from-red-500 to-pink-500'
    },
    bossBattle: {
      title: 'Combat de Boss',
      artist: 'Epic7 Boss Theme',
      icon: '🐉',
      color: 'from-purple-500 to-indigo-500'
    },
    connection: {
      title: 'Connexion',
      artist: 'Epic7 Login',
      icon: '🌟',
      color: 'from-green-500 to-blue-500'
    }
  };

  // Afficher l'overlay quand une nouvelle piste commence
  useEffect(() => {
    if (currentTrack && trackInfoMap[currentTrack]) {
      setTrackInfo(trackInfoMap[currentTrack]);
      setIsVisible(true);

      // Masquer après 3 secondes
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentTrack]);

  return (
    <AnimatePresence>
      {isVisible && trackInfo && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            exit: { duration: 0.3 }
          }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none"
        >
          <motion.div
            className={`
              backdrop-blur-lg rounded-xl border shadow-2xl overflow-hidden
              ${theme === 'dark' 
                ? 'bg-black/60 border-white/20 text-white' 
                : 'bg-white/60 border-white/40 text-gray-800'
              }
            `}
            animate={{
              boxShadow: [
                "0 0 20px rgba(0,0,0,0.1)",
                "0 0 40px rgba(59,130,246,0.3)",
                "0 0 20px rgba(0,0,0,0.1)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Barre de progression animée */}
            <motion.div
              className={`h-1 bg-gradient-to-r ${trackInfo.color}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
            />
            
            <div className="p-4 flex items-center space-x-4">
              {/* Icône avec animation */}
              <motion.div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  bg-gradient-to-r ${trackInfo.color} text-white text-xl font-bold
                `}
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {trackInfo.icon}
              </motion.div>

              {/* Informations de la piste */}
              <div className="flex-1">
                <motion.h3
                  className="font-bold text-lg leading-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {trackInfo.title}
                </motion.h3>
                <motion.p
                  className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {trackInfo.artist}
                </motion.p>
              </div>

              {/* Indicateur de lecture */}
              <motion.div
                className="flex items-center space-x-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className={`w-1 rounded-full bg-gradient-to-t ${trackInfo.color}`}
                      animate={{
                        height: ["8px", "16px", "8px"],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                <FaMusic className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </motion.div>
            </div>

            {/* Effet de brillance */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: [
                  "linear-gradient(90deg, transparent 0%, transparent 100%)",
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                  "linear-gradient(90deg, transparent 0%, transparent 100%)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
