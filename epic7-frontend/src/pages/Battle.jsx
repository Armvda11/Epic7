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
import { ModernCard, ModernButton } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { FaMagic, FaEye, FaSignOutAlt, FaUsers, FaDragon } from 'react-icons/fa';
import { GiSwordWound, GiShield } from 'react-icons/gi';
import { useBattleSounds } from '../hooks/useBattleSounds';

// utilitaire de log
function logBattleAction(message, data) {
  console.log(`%c[BATTLE] ${message}`, 'color: #42b883; font-weight: bold;', data);
}

export default function Battle() {
  const { theme, t, language } = useSettings();
  
  // 🗂 Sélection des héros
  const [selectionPhase,    setSelectionPhase]     = useState(true);
  const [availableHeroes,   setAvailableHeroes]   = useState([]);
  const [selectedHeroes,    setSelectedHeroes]    = useState([null, null]);

  // 🛡️ État du combat
  const [battleState,       setBattleState]       = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [selectedSkillId,   setSelectedSkillId]   = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [cooldowns,         setCooldowns]         = useState({});
  const [floatingDamages,   setFloatingDamages]   = useState([]);
  const [attackEffects,     setAttackEffects]     = useState([]);
  const [battleParticles,   setBattleParticles]   = useState([]);
  const [bossAttacking,     setBossAttacking]     = useState(false);
  const [reward,            setReward]            = useState(null);

  // 🎬 Animation des compétences
  const [skillAnimation,    setSkillAnimation]    = useState({
    isVisible: false,
    heroCode: null,
    skillPosition: null
  });

  const navigate   = useNavigate();
  const targetRefs = useRef({});
  const { preloadSounds, playSoundForAction } = useBattleSounds();

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
    
    // Précharger les sons
    preloadSounds();
  }, [preloadSounds]);

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
    }
  }

  async function handleBossAction() {
    await new Promise(r => setTimeout(r, 1000));
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

      // tour du boss après un délai
      setTimeout(async () => {
        setBossAttacking(true);
        await fetchBattleState();
        setBossAttacking(false);
      }, 800);
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
      <HeroSelectionPanel
        availableHeroes={availableHeroes}
        selectedHeroes={selectedHeroes}
        setSelectedHeroes={setSelectedHeroes}
        onStart={startCombat}
        rtaMode={false}
      />
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
      className={`relative h-screen w-screen overflow-hidden ${
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
              <ModernCard className="p-6 text-center backdrop-blur-md bg-red-500/20 border-red-400/30">
                <div className="flex items-center gap-3 mb-2">
                  <FaDragon className="text-red-400 text-2xl" />
                  <h3 className="text-2xl font-bold text-white">
                    {t("bossAttacking", language) || "Boss en action"}
                  </h3>
                </div>
                <p className="text-red-200">
                  {current.name} {t("preparingAttack", language) || "se prépare à attaquer..."}
                </p>
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
    </motion.div>
  );
}
