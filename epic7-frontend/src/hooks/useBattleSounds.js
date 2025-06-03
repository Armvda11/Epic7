import { useRef, useCallback } from 'react';

export function useBattleSounds() {
  const soundRefs = useRef({});

  // Précharger les sons de base
  const preloadSounds = useCallback(() => {
    const sounds = {
      attack: '/sounds/attack.mp3',
      magic: '/sounds/magic.mp3',
      heal: '/sounds/heal.mp3',
      critical: '/sounds/critical.mp3',
      damage: '/sounds/damage.mp3'
    };

    Object.entries(sounds).forEach(([key, src]) => {
      if (!soundRefs.current[key]) {
        const audio = new Audio(src);
        audio.volume = 0.3; // Volume par défaut
        audio.preload = 'auto';
        soundRefs.current[key] = audio;
      }
    });
  }, []);

  // Jouer un son
  const playSound = useCallback((soundType, volume = 0.3) => {
    try {
      const audio = soundRefs.current[soundType];
      if (audio) {
        audio.volume = volume;
        audio.currentTime = 0; // Reset pour permettre de rejouer rapidement
        audio.play().catch(err => {
          console.warn(`Impossible de jouer le son ${soundType}:`, err);
        });
      }
    } catch (error) {
      console.warn(`Erreur lors de la lecture du son ${soundType}:`, error);
    }
  }, []);

  // Déterminer le bon son selon le type d'attaque
  const playSoundForAction = useCallback((skillAction, isCritical = false, damageAmount = 0) => {
    if (isCritical) {
      playSound('critical', 0.5);
      return;
    }

    switch (skillAction) {
      case 'HEAL':
        playSound('heal', 0.4);
        break;
      case 'DAMAGE':
        if (damageAmount > 1000) {
          playSound('critical', 0.4);
        } else {
          playSound('attack', 0.3);
        }
        break;
      default:
        playSound('attack', 0.3);
    }
  }, [playSound]);

  return {
    preloadSounds,
    playSound,
    playSoundForAction
  };
}
