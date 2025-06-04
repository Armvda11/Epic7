// src/context/MusicContext.jsx
import React, { createContext, useContext, useEffect } from 'react';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

const MusicContext = createContext();

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const musicHook = useBackgroundMusic();

  useEffect(() => {
    // Précharger la musique au démarrage de l'application
    musicHook.preloadMusic();
    
    // Démarrer la musique du dashboard par défaut après un court délai
    // mais seulement si on n'est pas sur les pages de connexion ou d'inscription
    const timer = setTimeout(() => {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/' || currentPath === '/login' || currentPath === '/register';
      
      if (!musicHook.currentTrack && !isAuthPage) {
        musicHook.playDashboardMusic();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [musicHook]);

  return (
    <MusicContext.Provider value={musicHook}>
      {children}
    </MusicContext.Provider>
  );
};
