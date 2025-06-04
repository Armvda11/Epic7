import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axiosInstance';
import BattleHeroCard from '../components/battle/BattleHeroCard';
import BattleSkillBar from '../components/battle/BattleSkillBar';
import BattleEndOverlay from '../components/battle/BattleEndOverlay';
import BattleForfeitButton from '../components/battle/BattleForfeitButton';
import FloatingDamage from '../components/battle/FloatingDamage';
import AttackEffect from '../components/battle/AttackEffect';
import BattleParticles from '../components/battle/BattleParticles';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel';
import HeroPortraitOverlay from '../components/battle/HeroPortraitOverlay';
import TurnOrderBar from '../components/battle/TurnOrderBar';
import SkillAnimation from '../components/battle/SkillAnimation';
import BossSkillAnimation from '../components/battle/BossSkillAnimation';
import { ModernCard, ModernButton } from '../components/ui';
import { MusicController } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { FaMagic, FaEye, FaSignOutAlt, FaUsers, FaDragon } from 'react-icons/fa';
import { GiSwordWound, GiShield } from 'react-icons/gi';
import { useBattleSounds } from '../hooks/useBattleSounds';
import { useMusic } from '../context/MusicContext';

// utilitaire de log
function logBattleAction(message, data) {
  console.log(`%c[BATTLE] ${message}`, 'color: #42b883; font-weight: bold;', data);
}

export default function Battle() {
  const { theme, t, language } = useSettings();
  
  // Hook pour la musique de fond
  const {
    preloadMusic,
    playBossBattleMusic,
    playRtaSelectionMusic,
    stopCurrentMusic
  } = useMusic();
  
  // Hook pour les sons de bataille
  const { preloadSounds, playSoundForAction } = useBattleSounds();
  
  const navigate   = useNavigate();
  const targetRefs = useRef({});

  // ═══ États du composant ═══════════════════════════════════════════════
  const [battleState, setBattleState] = useState(null);
  const [selectedHeroes, setSelectedHeroes] = useState([null, null, null, null]);
  const [availableHeroes, setAvailableHeroes] = useState([]);
  const [selectionPhase, setSelectionPhase] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [cooldowns, setCooldowns] = useState({});
  const [reward, setReward] = useState(null);
  const [bossAttacking, setBossAttacking] = useState(false);
  const [bossAttackCount, setBossAttackCount] = useState(0);
  
  // États pour les animations
  const [skillAnimation, setSkillAnimation] = useState({
    isVisible: false,
    heroCode: null,
    skillPosition: null
  });
  const [floatingDamages, setFloatingDamages] = useState([]);
  const [attackEffects, setAttackEffects] = useState([]);
  const [battleParticles, setBattleParticles] = useState([]);

  // Animations variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const heroCardVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    hover: {
      scale: 1.05,
      y: -8,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  // ─── Chargements initiaux ──────────────────────────────────────────────
  useEffect(() => {
    API.get('/player-hero/my')
      .then(res => setAvailableHeroes(res.data))
      .catch(err => console.error("Erreur fetchAvailableHeroes:", err));
    
    // Précharger les sons et la musique
    preloadSounds();
    preloadMusic();
    
    // Démarrer la musique de sélection pour la phase de sélection des héros
    setTimeout(() => {
      playRtaSelectionMusic();
    }, 500);
    
    // Nettoyage lors du démontage
    return () => {
      stopCurrentMusic();
    };
  }, [preloadSounds, preloadMusic, playRtaSelectionMusic, stopCurrentMusic]);

  // ─── Gestion des récompenses ───────────────────────────────────────────
  async function fetchReward() {
    try {
      const res = await API.post('/combat/reward');
      setReward(res.data);
    } catch (err) {
      console.error("Erreur fetchReward:", err);
    }
  }

  // ─── Boucle de combat ──────────────────────────────────────────────────
  async function startCombat() {
    try {
      // Utiliser tous les héros sélectionnés (maintenant seulement 2 emplacements)
      const heroIds = selectedHeroes.filter(Boolean).map(h => h.id);
      await API.post('/combat/start', {
        bossHeroId: 1,
        selectedPlayerHeroIds: heroIds,
      });
      await fetchBattleState();
      setSelectionPhase(false);
      
      // Démarrer la musique de combat contre le boss
      setTimeout(() => {
        playBossBattleMusic();
      }, 1000);
      
    } catch (err) {
      console.error("Erreur startCombat:", err);
    }
  }

  async function fetchBattleState() {
    try {
      const { data: state } = await API.get('/combat/state');
      if (state.logs?.length) {
        logBattleAction('📜 LOGS DE COMBAT', state.logs.slice(-3));
      }
      setBattleState(state);
      setCooldowns(state.cooldowns || {});

      const curr = state.participants[state.currentTurnIndex];
      if (!curr.player && !state.finished) {
        setBossAttacking(true);
        setTimeout(handleBossAction, 1500);
      } else {
        // S'assurer que le boss ne semble plus attaquer quand c'est au tour du joueur
        setBossAttacking(false);
        
        if (curr.player) {
          // ← 👉 Notez le bon endpoint `/api/skill/player-hero/...`
          const { data: skills } = await API.get(`/skill/player-hero/${curr.id}/skills`);
          console.log(`Compétences chargées pour ${curr.name}:`, skills);
          setCurrentHeroSkills(skills);
        } else {
          setCurrentHeroSkills([]);
        }
        setSelectedSkillId(null);
        setSelectedSkillType(null);
      }
    } catch (err) {
      console.error("Erreur fetchBattleState:", err);
      // En cas d'erreur, s'assurer que le joueur peut toujours jouer
      setBossAttacking(false);
    }
  }

  async function handleBossAction() {
    // Délai initial réduit pour une expérience plus réactive
    await new Promise(r => setTimeout(r, 800));
    
    // Calculer les positions pour les effets visuels du boss
    let targetElement, targetX, targetY;
    
    // Trouver un héros du joueur comme cible
    const playerHeroes = battleState.participants.filter(p => p.player && p.currentHp > 0);
    if (playerHeroes.length > 0) {
      // Choisir un héros aléatoire du joueur comme cible
      const targetHero = playerHeroes[Math.floor(Math.random() * playerHeroes.length)];
      targetElement = targetRefs.current[targetHero.id];
      
      // Récupérer la position exacte de la cible pour les effets visuels
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      } else {
        // Position par défaut si la cible n'est pas trouvée
        targetX = window.innerWidth / 3;
        targetY = window.innerHeight / 2;
      }
      
      // Incrémenter le compteur d'attaques du boss
      const newCount = bossAttackCount + 1;
      setBossAttackCount(newCount);
      
      // Récupérer l'acteur courant (le boss)
      const boss = battleState.participants.find(p => !p.player);
      
      // Déterminer le type d'effet pour l'attaque du boss
      // Varier les types d'effet pour plus de diversité visuelle
      let effectType;
      if (newCount % 2 === 0) {
        {/* Pour les attaques spéciales, privilégier des effets plus impressionnants */}
        effectType = newCount % 6 === 0 ? 'magic' : 'slash';
      } else {
        effectType = 'impact';
      }
      
      // Ajouter un effet de tremblement à l'écran pour les attaques spéciales
      if (newCount % 2 === 0) {
        const battleContainer = document.querySelector('.battle-container');
        if (battleContainer) {
          battleContainer.classList.add('animate-shake');
          setTimeout(() => {
            battleContainer.classList.remove('animate-shake');
          }, 500);
        }
      }
      
      // Déterminer les dégâts (simulés pour l'affichage)
      // Augmenter les dégâts pour les attaques spéciales
      const baseDamage = Math.floor(Math.random() * 500) + 200;
      const damageAmount = newCount % 2 === 0 ? baseDamage * 2 : baseDamage;
      
      // Jouer le son approprié avec une chance plus élevée de critique pour les attaques spéciales
      const isCritical = newCount % 2 === 0 ? Math.random() < 0.8 : Math.random() < 0.3;
      playSoundForAction('DAMAGE', isCritical, damageAmount);
      
      // Effet de screen flash pour les attaques spéciales
      if (newCount % 2 === 0) {
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'fixed inset-0 z-45 pointer-events-none';
        flashOverlay.style.backgroundColor = effectType === 'magic' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        document.body.appendChild(flashOverlay);
        
        // Fade out puis supprimer
        setTimeout(() => {
          flashOverlay.style.transition = 'opacity 0.5s';
          flashOverlay.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(flashOverlay);
          }, 500);
        }, 100);
      }
      
      // Attendre un court délai avant d'afficher les effets visuels
      await new Promise(r => setTimeout(r, 400));
      
      // Ajouter plusieurs effets d'attaque pour les attaques spéciales
      const effectCount = newCount % 2 === 0 ? 5 : 2; // Augmentation du nombre d'effets
      
      // Récupérer la position du boss pour l'effet de rayon
      const bossElement = targetRefs.current[boss.id];
      let bossX = window.innerWidth * 0.7; // Position par défaut
      let bossY = window.innerHeight / 2;
      
      if (bossElement) {
        const bossRect = bossElement.getBoundingClientRect();
        bossX = bossRect.left + bossRect.width / 2;
        bossY = bossRect.top + bossRect.height / 2;
      }
      
      // Effet de rayon reliant le boss à la cible pour les attaques spéciales
      if (newCount % 2 === 0) {
        const beamId = Date.now() + Math.random() + 0.5;
        setAttackEffects(effects => [
          ...effects,
          {
            id: beamId,
            x: bossX,
            y: bossY,
            targetX: targetX,
            targetY: targetY,
            type: 'beam',
            beamColor: effectType === 'magic' ? 'purple' : effectType === 'slash' ? 'blue' : 'red',
            isVisible: true
          }
        ]);
        
        // Laisser le rayon apparaître un moment avant les impacts
        await new Promise(r => setTimeout(r, 300));
      }
      
      // Effets d'impact en séquence
      for (let i = 0; i < effectCount; i++) {
        const effectId = Date.now() + Math.random() + i;
        // Ajouter une variation plus importante dans la position pour les effets multiples
        const offsetX = i === 0 ? 0 : (Math.random() - 0.5) * 90;
        const offsetY = i === 0 ? 0 : (Math.random() - 0.5) * 90;
        
        // Varier les types d'effets pour plus de diversité
        let currentEffectType = effectType;
        if (newCount % 2 === 0 && i > 0) {
          // Pour les attaques spéciales, alterner entre différents types d'effets
          const effectTypes = ['magic', 'slash', 'impact'];
          currentEffectType = effectTypes[i % effectTypes.length];
        }
        
        setAttackEffects(effects => [
          ...effects,
          {
            id: effectId,
            x: targetX + offsetX,
            y: targetY + offsetY,
            type: currentEffectType,
            isVisible: true,
            size: newCount % 2 === 0 ? 'large' : 'normal' // Taille augmentée pour attaques spéciales
          }
        ]);
        
        // Ajouter un léger décalage entre les effets
        if (i < effectCount - 1) {
          await new Promise(r => setTimeout(r, 120));
        }
      }
      
      // Ajouter des particules pour plus de spectacle (comme pour les attaques du joueur)
      const particleType = newCount % 2 === 0 ? 'special' : (isCritical ? 'critical' : effectType);
      const particleId = Date.now() + Math.random() + 0.1;
      setBattleParticles(particles => [
        ...particles,
        {
          id: particleId,
          x: targetX,
          y: targetY,
          type: particleType,
          size: newCount % 2 === 0 ? 'large' : 'normal',
          isVisible: true
        }
      ]);
      
      // Ajouter un effet de tremblement au héros ciblé
      if (targetElement) {
        targetElement.classList.add('targeted');
        setTimeout(() => {
          targetElement.classList.remove('targeted');
        }, 1500);
      }
      
      // Attendre un court instant avant d'afficher les dégâts
      await new Promise(r => setTimeout(r, 200));
      
      // Afficher les dégâts flottants
      const damageId = Date.now() + Math.random() + 1;
      setFloatingDamages(damages => [
        ...damages,
        { 
          id: damageId, 
          x: targetX, 
          y: targetY - 50, 
          value: Math.round(damageAmount), 
          type: 'DAMAGE',
          isCritical: isCritical  // Passer l'information de critique au composant
        }
      ]);
      
      // Animation de compétence toutes les 2 attaques
      if (newCount % 2 === 0 && boss) {
        // Utiliser l'animation spéciale du boss
        setBossAnimation({
          isVisible: true,
          bossCode: boss.name
        });
        
        // Attendre l'animation avant de continuer
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Pour les attaques normales, ajouter un petit délai pour que les effets visuels soient visibles
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Retirer les effets après l'animation (avec un délai suffisamment long)
      setTimeout(() => {
        setAttackEffects(effects => effects.filter(e => e.id !== particleId));
        setBattleParticles(particles => particles.filter(p => p.id !== particleId));
      }, 1500);
      
      setTimeout(() => {
        setFloatingDamages(damages => damages.filter(d => d.id !== damageId));
      }, 2500);
    }
    
    // Attendre un court délai supplémentaire pour que les animations soient bien visibles
    // avant de passer au tour suivant
    await new Promise(r => setTimeout(r, 400));
    
    // Mettre à jour l'état du combat
    await fetchBattleState();
    setBossAttacking(false);
  }

  // ─── Utilisation d'une compétence ─────────────────────────────────────
  async function useSkill(targetId) {
    try {
      // on récupère l'acteur courant
      const actor = battleState.participants[battleState.currentTurnIndex];
      
      // Trouver la compétence sélectionnée pour obtenir sa position
      const selectedSkill = currentHeroSkills.find(skill => skill.id === selectedSkillId);
      
      // Si c'est la compétence en position 2, déclencher l'animation
      if (selectedSkill && selectedSkill.position === 2) {
        logBattleAction('🎬 DÉCLENCHEMENT ANIMATION', {
          hero: actor.name,
          skill: selectedSkill.name,
          position: selectedSkill.position
        });
        
        setSkillAnimation({
          isVisible: true,
          heroCode: actor.name, // Utiliser le nom du héros pour correspondre aux fichiers d'animation
          skillPosition: selectedSkill.position
        });
        
        // Attendre 3 secondes pour l'animation complète
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // on envoie l'action au back
      const { data: result } = await API.post('/combat/action/skill', {
        playerHeroId: actor.id,
        skillId:      selectedSkillId,
        targetId,
      });

      // on met à jour tout
      setBattleState(result.battleState);
      setCooldowns(result.battleState.cooldowns);

      // Calculer la position de la cible pour les effets visuels
      const targetElement = targetRefs.current[targetId];
      let targetX = window.innerWidth / 2; // Position par défaut au centre
      let targetY = window.innerHeight / 2;
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      // Déterminer le type d'effet basé sur l'action de la compétence
      let effectType = 'impact';
      if (selectedSkill) {
        if (selectedSkill.action === 'HEAL') {
          effectType = 'heal';
        } else if (selectedSkill.name.toLowerCase().includes('magic') || selectedSkill.name.toLowerCase().includes('spell')) {
          effectType = 'magic';
        } else if (selectedSkill.name.toLowerCase().includes('slash') || selectedSkill.name.toLowerCase().includes('cut')) {
          effectType = 'slash';
        }
      }

      // Ajouter l'effet d'attaque
      if (result.damageDealt > 0 || result.type === 'HEAL') {
        // Jouer le son approprié
        const isCritical = result.damageDealt > 1500;
        playSoundForAction(selectedSkill?.action || 'DAMAGE', isCritical, result.damageDealt);
        
        const effectId = Date.now() + Math.random();
        setAttackEffects(effects => [
          ...effects,
          {
            id: effectId,
            x: targetX,
            y: targetY,
            type: effectType,
            isVisible: true
          }
        ]);

        // Ajouter des particules pour plus de spectacle
        const particleType = isCritical ? 'critical' : effectType;
        const particleId = Date.now() + Math.random() + 0.1;
        setBattleParticles(particles => [
          ...particles,
          {
            id: particleId,
            x: targetX,
            y: targetY,
            type: particleType,
            isVisible: true
          }
        ]);

        // Retirer les effets après l'animation
        setTimeout(() => {
          setAttackEffects(effects => effects.filter(e => e.id !== effectId));
          setBattleParticles(particles => particles.filter(p => p.id !== particleId));
        }, 1200);
      }

      // dégâts flottants avec la bonne position
      if (result.damageDealt > 0 || result.type === 'HEAL') {
        const damageId = Date.now() + Math.random() + 1;
        setFloatingDamages(damages => [
          ...damages,
          { 
            id: damageId, 
            x: targetX, 
            y: targetY - 50, // Légèrement au-dessus de la cible
            value: result.damageDealt || result.healAmount || 0, 
            type: result.type 
          }
        ]);

        // Retirer les dégâts flottants après l'animation
        setTimeout(() => {
          setFloatingDamages(damages => damages.filter(d => d.id !== damageId));
        }, 2500);
      }

      // tour du boss après un délai plus naturel
      setTimeout(async () => {
        // Afficher l'overlay d'attaque du boss
        setBossAttacking(true);
        
        // Délai pour que l'overlay soit visible avant le début des animations
        // Cela donne l'impression que le boss "réfléchit" à son action
        await new Promise(r => setTimeout(r, 600));
        
        // Déclencher l'action du boss avec les effets visuels
        // (pas besoin de réinitialiser bossAttacking ici, car handleBossAction le fera)
        await fetchBattleState();
      }, 800); // Délai réduit pour une meilleure fluidité
    } catch (err) {
      console.error("Erreur useSkill:", err);
    }
  }

  // ─── Gestion de la fin d'animation ────────────────────────────────────
  function handleAnimationEnd() {
    logBattleAction('🎬 FIN ANIMATION', 'Animation terminée');
    setSkillAnimation({
      isVisible: false,
      heroCode: null,
      skillPosition: null
    });
  }
  
  // ─── Gestion de la fin d'animation du boss ─────────────────────────────
  function handleBossAnimationEnd() {
    logBattleAction('🐉 FIN ANIMATION BOSS', 'Animation du boss terminée');
    setBossAnimation({
      isVisible: false,
      bossCode: null
    });
  }

  function handleSkillClick(skill) {
    if (skill.category === 'PASSIVE') return;
    const curr = battleState.participants[battleState.currentTurnIndex];
    const cd   = cooldowns[curr.id]?.[skill.id] || 0;
    if (cd > 0) {
      console.log(`🕒 ${skill.name} en cooldown (${cd})`);
      return;
    }

    logBattleAction('🔍 COMPÉTENCE SÉLECTIONNÉE', {
      hero:    curr.name,
      skill:   skill.name,
      action:  skill.action,
      cooldown: skill.cooldown
    });

    if (selectedSkillId === skill.id) {
      const def = battleState.participants.find(p =>
        skill.action === 'HEAL' ? p.player : !p.player
      );
      if (def) useSkill(def.id);
    } else {
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
    }
  }

  function getHighlightClass(p) {
    if (!selectedSkillId) return '';
    const ok = (selectedSkillType === 'DAMAGE' && !p.player)
            || (selectedSkillType === 'HEAL'   && p.player);
    return ok
      ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer'
      : 'brightness-75';
  }

  // désélection au clic extérieur
  useEffect(() => {
    const onDoc = e => {
      const bar = document.getElementById('skill-bar');
      if (!bar?.contains(e.target) && !e.target.closest('.battle-target')) {
        setSelectedSkillId(null);
        setSelectedSkillType(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function getNextTurnIndex() {
    const arr = battleState.participants;
    for (let i = 1; i < arr.length; i++) {
      const idx = (battleState.currentTurnIndex + i) % arr.length;
      if (arr[idx].currentHp > 0) return idx;
    }
    return null;
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────
  if (selectionPhase) {
    return (
      <div className="relative">
        <HeroSelectionPanel
          availableHeroes={availableHeroes}
          selectedHeroes={selectedHeroes}
          setSelectedHeroes={setSelectedHeroes}
          onStart={startCombat}
          rtaMode={false}
        />
        <MusicController />
      </div>
    );
  }
  if (!battleState) {
    return (
      <div className={`h-screen w-screen relative overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        {/* Particules de fond */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${
                theme === 'dark' ? 'bg-blue-400/40' : 'bg-purple-400/40'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Contenu de chargement */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ModernCard className="text-center p-8">
              <motion.div
                className={`w-16 h-16 mx-auto mb-6 rounded-full ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                } flex items-center justify-center`}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <GiBroadsword className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className={`text-2xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {t("loadingBattle", language) || "Chargement du combat..."}
              </h2>
              <p className={`${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {t("preparingArena", language) || "Préparation de l'arène..."}
              </p>
            </ModernCard>
          </motion.div>
        </div>
      </div>
    );
  }

  const current      = battleState.participants[battleState.currentTurnIndex];
  const isPlayerTurn = current.player;
  const nextIdx      = getNextTurnIndex();
  const players      = battleState.participants.filter(p => p.player && p.currentHp > 0);
  const enemies      = battleState.participants.filter(p => !p.player && p.currentHp > 0);

  return (
    <motion.div 
      className={`battle-container relative h-screen w-screen overflow-hidden ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Arrière-plan avec arena overlay */}
      <div 
        className="absolute inset-0 opacity-30 bg-[url('/arena.webp')] bg-cover bg-center"
        style={{ filter: 'blur(1px)' }}
      />
      
      {/* Particules de fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }, (_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              theme === 'dark' ? 'bg-blue-400/40' : 'bg-purple-400/40'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Portrait du héros actuel avec effet moderne */}
      <motion.div variants={itemVariants}>
        <HeroPortraitOverlay hero={current} />
      </motion.div>

      {/* Overlay d'attaque du boss avec effet moderne */}
      <AnimatePresence>
        {bossAttacking && (
          <motion.div 
            className="absolute inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ModernCard className={`p-6 text-center backdrop-blur-md ${
                bossAttackCount % 2 === 0 
                  ? 'bg-purple-500/30 border-purple-400/40' 
                  : 'bg-red-500/20 border-red-400/30'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <FaDragon className={`text-2xl ${
                    bossAttackCount % 2 === 0 ? 'text-purple-400' : 'text-red-400'
                  }`} />
                  <h3 className="text-2xl font-bold text-white">
                    {bossAttackCount % 2 === 0 
                      ? (t("bossPowerAttack", language) || "Attaque puissante!") 
                      : (t("bossAttacking", language) || "Boss en action")}
                  </h3>
                </div>
                <p className={`${
                  bossAttackCount % 2 === 0 ? 'text-purple-200' : 'text-red-200'
                }`}>
                  {current.name} {bossAttackCount % 2 === 0 
                    ? (t("preparingSpecialAttack", language) || "prépare une attaque spéciale!") 
                    : (t("preparingAttack", language) || "se prépare à attaquer...")}
                </p>
                
                {/* Effets visuels supplémentaires pour les attaques spéciales */}
                {bossAttackCount % 2 === 0 && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 8 }, (_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-purple-500 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          scale: [0, 1.5, 0],
                          opacity: [0, 0.8, 0],
                          x: [0, (Math.random() - 0.5) * 50],
                          y: [0, (Math.random() - 0.5) * 50],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatType: "loop",
                          delay: Math.random() * 0.5,
                        }}
                      />
                    ))}
                  </div>
                )}
              </ModernCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barres d'ordre de tour avec cartes modernes */}
      <motion.div 
        className="absolute top-20 left-0 pl-4 z-40"
        variants={itemVariants}
      >
        <ModernCard className="p-4 backdrop-blur-md bg-white/10 border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <FaUsers className="text-green-400" />
            <span className="text-sm font-medium text-white">
              {t("heroes", language) || "Héros"}
            </span>
          </div>
          <TurnOrderBar 
            participants={players} 
            currentId={current.id} 
            nextId={battleState.participants[nextIdx]?.id}
          />
        </ModernCard>
      </motion.div>

      <motion.div 
        className="absolute top-20 right-0 pr-4 z-40"
        variants={itemVariants}
      >
        <ModernCard className="p-4 backdrop-blur-md bg-white/10 border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <FaDragon className="text-red-400" />
            <span className="text-sm font-medium text-white">
              {t("bosses", language) || "Boss"}
            </span>
          </div>
          <TurnOrderBar 
            participants={enemies} 
            currentId={current.id} 
            nextId={battleState.participants[nextIdx]?.id}
          />
        </ModernCard>
      </motion.div>

      {/* Zone principale avec tous les participants */}
      <div className="absolute inset-0 flex items-center justify-between px-20">
        {/* Zone des héros alliés (à gauche) */}
        <motion.div 
          className="flex flex-col gap-12 items-start"
          variants={itemVariants}
        >
          {[players.slice(0,2), players.slice(2)].map((row, i) => (
            <div key={i} className="flex gap-8">
              {row.map((hero, index) => (
                <motion.div 
                  key={hero.id} 
                  ref={el => targetRefs.current[hero.id] = el} 
                  className="battle-target"
                  variants={heroCardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <BattleHeroCard
                    hero={hero}
                    isCurrent={hero.id === current.id}
                    isNext={hero.id === battleState.participants[nextIdx]?.id}
                    highlight={getHighlightClass(hero)}
                    onClick={() => selectedSkillId && selectedSkillType==='HEAL' && useSkill(hero.id)}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>

        {/* Zone des ennemis (à droite) */}
        <motion.div 
          className="flex flex-col gap-12 items-end"
          variants={itemVariants}
        >
          {[enemies.slice(0,2), enemies.slice(2)].map((row, i) => (
            <div key={i} className="flex gap-8">
              {row.map((boss, index) => (
                <motion.div 
                  key={boss.id} 
                  ref={el => targetRefs.current[boss.id] = el} 
                  className="battle-target"
                  variants={heroCardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <BattleHeroCard
                    hero={boss}
                    isCurrent={boss.id === current.id}
                    highlight={getHighlightClass(boss)}
                    onClick={() => selectedSkillId && selectedSkillType==='DAMAGE' && useSkill(boss.id)}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Barre de compétences moderne */}
      <AnimatePresence>
        {isPlayerTurn && currentHeroSkills.length > 0 && (
          <motion.div 
            id="skill-bar" 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <ModernCard className="p-4 backdrop-blur-md bg-white/10 border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <FaMagic className="text-purple-400" />
                <span className="text-sm font-medium text-white">
                  {t("skills", language) || "Compétences"} - {current?.name}
                </span>
              </div>
              <BattleSkillBar
                currentHero={current}
                currentHeroSkills={currentHeroSkills}
                cooldowns={cooldowns}
                selectedSkillId={selectedSkillId}
                onSkillClick={handleSkillClick}
              />
            </ModernCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effets de combat */}
      <AnimatePresence>
        {floatingDamages.map(fd => <FloatingDamage key={fd.id} {...fd} />)}
      </AnimatePresence>

      <AnimatePresence>
        {attackEffects.map(effect => (
          <AttackEffect 
            key={effect.id} 
            x={effect.x} 
            y={effect.y} 
            type={effect.type}
            isVisible={effect.isVisible}
            onAnimationEnd={() => {
              setAttackEffects(effects => effects.filter(e => e.id !== effect.id));
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {battleParticles.map(particle => (
          <BattleParticles
            key={particle.id}
            x={particle.x}
            y={particle.y}
            type={particle.type}
            isVisible={particle.isVisible}
            onAnimationEnd={() => {
              setBattleParticles(particles => particles.filter(p => p.id !== particle.id));
            }}
          />
        ))}
      </AnimatePresence>

      {/* Animation de compétence */}
      <SkillAnimation
        heroCode={skillAnimation.heroCode}
        skillPosition={skillAnimation.skillPosition}
        isVisible={skillAnimation.isVisible}
        onAnimationEnd={handleAnimationEnd}
      />
      
      {/* Animation d'attaque spéciale du boss */}
      <BossSkillAnimation
        bossCode={bossAnimation.bossCode}
        isVisible={bossAnimation.isVisible}
        onAnimationEnd={handleBossAnimationEnd}
      />

      {/* Overlay de fin de combat */}
      <AnimatePresence>
        {battleState.finished && (
          <BattleEndOverlay
            status={battleState.logs.some(l => l.includes('Victoire')) ? 'VICTOIRE' : 'DÉFAITE'}
            reward={reward}
            onReturn={() => navigate('/dashboard')}
          />
        )}
      </AnimatePresence>

      {/* Bouton d'abandon moderne */}
      <AnimatePresence>
        {isPlayerTurn && !battleState.finished && (
          <motion.div 
            className="absolute bottom-4 right-4 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <ModernButton
              variant="danger"
              onClick={() => setSelectionPhase(true)}
              icon={<FaSignOutAlt />}
              className="text-white font-medium"
            >
              {t("forfeit", language) || "Abandonner"}
            </ModernButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contrôleur de musique */}
      <MusicController />
    </motion.div>
  );
}
