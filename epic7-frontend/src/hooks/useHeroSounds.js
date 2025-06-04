import { useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Hook pour gérer les sons spécifiques des héros selon leurs compétences
 * - Compétence position 0 : son {heroName}_basic.mp3
 * - Compétence position 2 : son {heroName}_special.mp3
 */
export function useHeroSounds() {
  const { heroSoundsVolume } = useSettings();
  const heroSoundRefs = useRef({});

  /**
   * Précharge les sons pour un héros spécifique
   * @param {string} heroName - Nom du héros (ex: "archidemon", "bellona")
   */
  const preloadHeroSounds = useCallback((heroName) => {
    if (!heroName) return;
    
    const heroKey = heroName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (!heroSoundRefs.current[heroKey]) {
      heroSoundRefs.current[heroKey] = {};
    }

    // Précharger le son basic
    if (!heroSoundRefs.current[heroKey].basic) {
      try {
        const basicAudio = new Audio(`/sounds/${heroKey}/${heroKey}_basic.mp3`);
        basicAudio.volume = heroSoundsVolume;
        basicAudio.preload = 'auto';
        heroSoundRefs.current[heroKey].basic = basicAudio;
      } catch (error) {
        console.warn(`Impossible de précharger le son basic pour ${heroKey}:`, error);
      }
    }

    // Précharger le son special
    if (!heroSoundRefs.current[heroKey].special) {
      try {
        const specialAudio = new Audio(`/sounds/${heroKey}/${heroKey}_special.mp3`);
        specialAudio.volume = heroSoundsVolume;
        specialAudio.preload = 'auto';
        heroSoundRefs.current[heroKey].special = specialAudio;
      } catch (error) {
        console.warn(`Impossible de précharger le son special pour ${heroKey}:`, error);
      }
    }
  }, []);

  /**
   * Précharge les sons pour plusieurs héros
   * @param {Array} heroNames - Array des noms des héros
   */
  const preloadMultipleHeroSounds = useCallback((heroNames) => {
    if (!heroNames || !Array.isArray(heroNames)) return;
    
    heroNames.forEach(heroName => {
      if (heroName) {
        preloadHeroSounds(heroName);
      }
    });
  }, [preloadHeroSounds]);

  /**
   * Joue le son d'un héros selon sa compétence
   * @param {string} heroName - Nom du héros
   * @param {number} skillPosition - Position de la compétence (0 = basic, 2 = special)
   * @param {number} customVolume - Volume personnalisé (optionnel, utilise heroSoundsVolume par défaut)
   */
  const playHeroSkillSound = useCallback((heroName, skillPosition, customVolume = null) => {
    if (!heroName || skillPosition === undefined) return;

    const heroKey = heroName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const volume = customVolume !== null ? customVolume : heroSoundsVolume;
    
    // Déterminer le type de son selon la position
    let soundType;
    if (skillPosition === 0) {
      soundType = 'basic';
    } else if (skillPosition === 2) {
      soundType = 'special';
    } else {
      // Pour les autres positions (1, 3, etc.), on peut utiliser basic par défaut
      soundType = 'basic';
    }

    try {
      const heroSounds = heroSoundRefs.current[heroKey];
      if (heroSounds && heroSounds[soundType]) {
        const audio = heroSounds[soundType];
        audio.volume = Math.min(Math.max(volume, 0), 1); // Assurer que le volume est entre 0 et 1
        audio.currentTime = 0; // Reset pour permettre de rejouer rapidement
        
        audio.play().catch(err => {
          console.warn(`Impossible de jouer le son ${soundType} pour ${heroKey}:`, err);
        });
      } else {
        console.warn(`Son ${soundType} non trouvé pour le héros ${heroKey}`);
        // Essayer de précharger les sons manquants
        preloadHeroSounds(heroName);
      }
    } catch (error) {
      console.warn(`Erreur lors de la lecture du son pour ${heroKey}:`, error);
    }
  }, [preloadHeroSounds, heroSoundsVolume]);

  /**
   * Met à jour le volume de tous les sons de héros préchargés
   * @param {number} newVolume - Nouveau volume (0-1)
   */
  const updateAllHeroSoundsVolume = useCallback((newVolume) => {
    const clampedVolume = Math.min(Math.max(newVolume, 0), 1);
    
    Object.values(heroSoundRefs.current).forEach(heroSounds => {
      if (heroSounds) {
        Object.values(heroSounds).forEach(audio => {
          if (audio) {
            audio.volume = clampedVolume;
          }
        });
      }
    });
  }, []);

  /**
   * Arrête tous les sons des héros
   */
  const stopAllHeroSounds = useCallback(() => {
    Object.values(heroSoundRefs.current).forEach(heroSounds => {
      if (heroSounds) {
        Object.values(heroSounds).forEach(audio => {
          if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      }
    });
  }, []);

  /**
   * Obtient la liste des héros dont les sons sont préchargés
   */
  const getLoadedHeroes = useCallback(() => {
    return Object.keys(heroSoundRefs.current);
  }, []);

  return {
    preloadHeroSounds,
    preloadMultipleHeroSounds,
    playHeroSkillSound,
    updateAllHeroSoundsVolume,
    stopAllHeroSounds,
    getLoadedHeroes,
    currentVolume: heroSoundsVolume
  };
}
