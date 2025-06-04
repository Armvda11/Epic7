// src/hooks/useBackgroundMusic.js
import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook pour gérer la musique de fond dans toute l'application
 */
export function useBackgroundMusic() {
  const audioRefs = useRef({});
  const currentTrackRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const isPausedRef = useRef(false);

  // Configuration des pistes musicales
  const musicTracks = {
    dashboard: '/sounds/dashboard.mp3',
    rtaSelection: '/sounds/selection.mp3',
    rtaBattle: '/sounds/rta.mp3',
    bossBattle: '/sounds/boss.mp3',
    connection: '/sounds/connexion.mp3'
  };

  // Précharger toutes les pistes audio
  const preloadMusic = useCallback(() => {
    Object.entries(musicTracks).forEach(([key, src]) => {
      if (!audioRefs.current[key]) {
        const audio = new Audio(src);
        audio.loop = true;
        audio.volume = 0.3; // Volume par défaut
        audio.preload = 'auto';
        
        // Gestionnaires d'événements
        audio.addEventListener('loadeddata', () => {
          console.log(`🎵 Musique préchargée: ${key}`);
        });
        
        audio.addEventListener('error', (e) => {
          console.warn(`⚠️ Erreur de chargement de la musique ${key}:`, e);
        });
        
        audioRefs.current[key] = audio;
      }
    });
  }, []);

  // Fonction pour faire un fade out progressif
  const fadeOut = useCallback((audio, duration = 1000, callback) => {
    if (!audio) return;
    
    const startVolume = audio.volume;
    const fadeStep = startVolume / (duration / 50); // 50ms par step
    
    const fadeInterval = setInterval(() => {
      if (audio.volume > fadeStep) {
        audio.volume -= fadeStep;
      } else {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeInterval);
        if (callback) callback();
      }
    }, 50);
    
    return fadeInterval;
  }, []);

  // Fonction pour faire un fade in progressif
  const fadeIn = useCallback((audio, targetVolume = 0.3, duration = 1000) => {
    if (!audio) return;
    
    audio.volume = 0;
    audio.play().catch(err => {
      console.warn('Erreur lors de la lecture de la musique:', err);
    });
    
    const fadeStep = targetVolume / (duration / 50);
    
    const fadeInterval = setInterval(() => {
      if (audio.volume < targetVolume - fadeStep) {
        audio.volume += fadeStep;
      } else {
        audio.volume = targetVolume;
        clearInterval(fadeInterval);
      }
    }, 50);
    
    return fadeInterval;
  }, []);

  // Arrêter la musique actuelle
  const stopCurrentMusic = useCallback((fadeDuration = 1000) => {
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      if (currentAudio && !currentAudio.paused) {
        fadeOut(currentAudio, fadeDuration, () => {
          currentTrackRef.current = null;
        });
      } else {
        currentTrackRef.current = null;
      }
    }
  }, [fadeOut]);

  // Jouer une piste spécifique avec transition
  const playMusic = useCallback((trackName, volume = 0.3, fadeInDuration = 1000, fadeOutDuration = 1000) => {
    // Annuler tout timeout de fade en cours
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    // Si c'est déjà la piste actuelle, ne rien faire
    if (currentTrackRef.current === trackName) {
      return;
    }

    const newAudio = audioRefs.current[trackName];
    if (!newAudio) {
      console.warn(`Piste audio non trouvée: ${trackName}`);
      return;
    }

    // Arrêter la musique actuelle en douceur
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      if (currentAudio && !currentAudio.paused) {
        fadeOut(currentAudio, fadeOutDuration, () => {
          // Démarrer la nouvelle piste après le fade out
          currentTrackRef.current = trackName;
          newAudio.currentTime = 0; // Recommencer depuis le début
          fadeIn(newAudio, volume, fadeInDuration);
        });
      } else {
        // Pas de musique en cours, démarrer directement
        currentTrackRef.current = trackName;
        newAudio.currentTime = 0;
        fadeIn(newAudio, volume, fadeInDuration);
      }
    } else {
      // Pas de musique en cours, démarrer directement
      currentTrackRef.current = trackName;
      newAudio.currentTime = 0;
      fadeIn(newAudio, volume, fadeInDuration);
    }
  }, [fadeIn, fadeOut]);

  // Changer le volume de la piste actuelle
  const setVolume = useCallback((volume) => {
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      if (currentAudio) {
        currentAudio.volume = Math.max(0, Math.min(1, volume));
      }
    }
  }, []);

  // Mettre en pause/reprendre la musique
  const pauseMusic = useCallback(() => {
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      if (currentAudio && !currentAudio.paused) {
        console.log('Mise en pause de la musique');
        currentAudio.pause();
        isPausedRef.current = true;
        return true;
      }
    }
    return false;
  }, []);

  const resumeMusic = useCallback(() => {
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      if (currentAudio && currentAudio.paused) {
        console.log('Reprise de la musique');
        currentAudio.play().catch(err => {
          console.warn('Erreur lors de la reprise de la musique:', err);
        });
        isPausedRef.current = false;
        return true;
      }
    }
    return false;
  }, []);

  // Vérifier si la musique est en pause
  const isMusicPaused = useCallback(() => {
    if (currentTrackRef.current) {
      const currentAudio = audioRefs.current[currentTrackRef.current];
      return currentAudio ? currentAudio.paused : true;
    }
    return true;
  }, []);

  // Fonctions spécifiques pour chaque section du jeu
  const playDashboardMusic = useCallback(() => {
    playMusic('dashboard', 0.25, 2000, 1000);
  }, [playMusic]);

  const playRtaSelectionMusic = useCallback(() => {
    playMusic('rtaSelection', 0.35, 1500, 1000);
  }, [playMusic]);

  const playRtaBattleMusic = useCallback(() => {
    playMusic('rtaBattle', 0.4, 1000, 800);
  }, [playMusic]);

  const playBossBattleMusic = useCallback(() => {
    playMusic('bossBattle', 0.45, 800, 800);
  }, [playMusic]);

  const playConnectionMusic = useCallback(() => {
    playMusic('connection', 0.3, 500, 500);
  }, [playMusic]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      // Arrêter toute la musique et nettoyer les timeouts
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      
      Object.values(audioRefs.current).forEach(audio => {
        if (audio && !audio.paused) {
          audio.pause();
        }
      });
    };
  }, []);

  return {
    preloadMusic,
    playMusic,
    stopCurrentMusic,
    setVolume,
    pauseMusic,
    resumeMusic,
    isMusicPaused,
    playDashboardMusic,
    playRtaSelectionMusic,
    playRtaBattleMusic,
    playBossBattleMusic,
    playConnectionMusic,
    currentTrack: currentTrackRef.current
  };
}
