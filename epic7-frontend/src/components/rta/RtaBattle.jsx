import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BattleHeroCard from '../battle/BattleHeroCard';
import BattleSkillBar from '../battle/BattleSkillBar';
import BattleForfeitButton from '../battle/BattleForfeitButton';
import HeroPortraitOverlay from '../battle/HeroPortraitOverlay';
import TurnOrderBar from '../battle/TurnOrderBar';
import SkillAnimation from '../battle/SkillAnimation';
import FloatingDamage from '../battle/FloatingDamage';
import AttackEffect from '../battle/AttackEffect';
import BattleParticles from '../battle/BattleParticles';
import { ModernCard, ModernButton } from '../ui';
import { useSettings } from '../../context/SettingsContext';
import { FaMagic, FaEye, FaSignOutAlt, FaBug, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { GiBroadsword, GiShield } from 'react-icons/gi';
import API from '../../api/axiosInstance';

export default function RtaBattle({ battleState, battleId, useSkill, onForfeit }) {
  const { theme, t, language } = useSettings();
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [cooldowns, setCooldowns] = useState({});
  const [showDevLogs, setShowDevLogs] = useState(false);
  const targetRefs = useRef({});

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

  // Préchargement des images des héros
  useEffect(() => {
    if (battleState?.participants) {
      const preloadHeroImages = async () => {
        const promises = battleState.participants.map(hero => {
          return new Promise((resolve) => {
            try {
              if (!hero.name) {
                console.error("Héros sans nom détecté:", hero);
                resolve();
                return;
              }
              
              // Utiliser la fonction heroImg importée de '../battle/BattleHeroCard'
              const img = new Image();
              const imgSrc = `/epic7-Hero/webp/${hero.name.toLowerCase().replace(/ /g, '-')}.webp`;
              
              console.log(`Préchargement de l'image pour ${hero.name}: ${imgSrc}`);
              
              img.onload = () => {
                console.log(`Image chargée avec succès pour ${hero.name}`);
                resolve();
              };
              
              img.onerror = () => {
                console.warn(`Erreur de chargement de l'image pour ${hero.name}, utilisation de l'image par défaut`);
                // Charger l'image par défaut comme fallback
                const defaultImg = new Image();
                defaultImg.src = '/epic7-Hero/webp/unknown.webp';
                defaultImg.onload = resolve;
                defaultImg.onerror = resolve;
              };
              
              img.src = imgSrc;
            } catch (error) {
              console.error('Erreur lors du préchargement des images:', error);
              resolve();
            }
          });
        });
        
        try {
          await Promise.all(promises);
          console.log("Préchargement des images terminé");
        } catch (error) {
          console.error("Erreur lors du préchargement des images:", error);
        }
      };
      
      preloadHeroImages();
    }
  }, [battleState?.participants]);

  // Mettre à jour les compétences du héros actuel lorsque le battleState change
  useEffect(() => {
    if (!battleState) return;
    
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    // Vérifier si c'est le tour du joueur actuel (l'utilisateur courant)
    const isPlayerTurn = currentHero.userId === battleState.currentUserId;
    
    // Debug pour voir les héros disponibles
    console.log("RtaBattle - Participants:", battleState.participants);
    console.log("RtaBattle - CurrentHero:", currentHero);
    
    // Charger les compétences si c'est au tour du joueur
    if (isPlayerTurn) {
      const fetchHeroSkills = async () => {
        try {
          // Correction: Utiliser le bon endpoint pour récupérer les compétences
          const res = await API.get(`/skill/player-hero/${currentHero.id}/skills`);
          console.log(`Compétences chargées pour ${currentHero.name}:`, res.data);
          setCurrentHeroSkills(res.data);
        } catch (error) {
          console.error(`Erreur lors du chargement des compétences:`, error);
        }
      };
      
      fetchHeroSkills();
    } else {
      setCurrentHeroSkills([]);
    }
    
    // Réinitialiser les sélections
    setSelectedSkillId(null);
    setSelectedSkillType(null);
    
    // Mettre à jour les cooldowns
    setCooldowns(battleState.cooldowns || {});
  }, [battleState]);

  // Désélectionner la compétence si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      const skillBar = document.getElementById("skill-bar");
      const isClickOnSkillBar = skillBar && skillBar.contains(event.target);
      const isClickOnTarget = event.target.closest(".battle-target");
      
      if (!isClickOnSkillBar && !isClickOnTarget) {
        setSelectedSkillId(null);
        setSelectedSkillType(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Gérer le clic sur une compétence avec animations
  const handleSkillClick = async (skill) => {
    if (skill.category === 'PASSIVE') return;
    
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    const cooldownLeft = cooldowns?.[currentHero?.id]?.[skill.id] || 0;
    
    if (cooldownLeft > 0) return;
    
    if (selectedSkillId === skill.id) {
      const defaultTarget = battleState.participants.find(p => skill.action === 'HEAL' ? p.player : !p.player);
      if (defaultTarget) {
        await executeSkillWithAnimations(currentHero, skill, defaultTarget);
      }
    } else {
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
    }
  };

  // Fonction pour ajouter les effets visuels
  const addVisualEffects = (skill, target) => {
    // Calculer la position de la cible pour les effets visuels
    const targetElement = targetRefs.current[target.id];
    let targetPosition = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 }; // Position par défaut au centre
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      targetPosition = {
        x: rect.left + rect.width / 2,  // Centre horizontal de l'élément
        y: rect.top + rect.height / 2   // Centre vertical de l'élément
      };
      console.log('Position de la cible calculée (pixels):', targetPosition);
      console.log('Rect de la cible:', rect);
    } else {
      console.warn('Élément cible non trouvé pour l\'ID:', target.id);
    }

    // Ajouter l'effet d'attaque
    const effectId = Date.now();
    console.log('Ajout de l\'effet d\'attaque:', effectId);
    setAttackEffects(prev => [...prev, {
      id: effectId,
      type: skill.action === 'HEAL' ? 'heal' : (skill.element === 'FIRE' ? 'magic' : 'slash'),
      position: targetPosition
    }]);

    // Simuler les dégâts/soins (en attente de la vraie logique)
    const damage = Math.floor(Math.random() * 1000) + 500;
    const isCritical = Math.random() < 0.3;
    
    // Ajouter les dégâts flottants
    const damageId = Date.now() + 1;
    console.log('Ajout des dégâts flottants:', damageId, damage);
    setFloatingDamages(prev => [...prev, {
      id: damageId,
      value: damage,
      type: skill.action === 'HEAL' ? 'HEAL' : 'DAMAGE',
      isCritical,
      position: targetPosition
    }]);

    // Ajouter des particules
    const particleId = Date.now() + 2;
    console.log('Ajout des particules:', particleId);
    setBattleParticles(prev => [...prev, {
      id: particleId,
      type: skill.action === 'HEAL' ? 'heal' : 'damage',
      position: targetPosition,
      count: isCritical ? 15 : 10
    }]);

    // Nettoyer les effets après un délai
    setTimeout(() => {
      console.log('Nettoyage des effets visuels');
      setAttackEffects(prev => prev.filter(effect => effect.id !== effectId));
      setFloatingDamages(prev => prev.filter(damage => damage.id !== damageId));
      setBattleParticles(prev => prev.filter(particle => particle.id !== particleId));
    }, 3000);
  };

  // Fonction pour exécuter une compétence avec animations
  const executeSkillWithAnimations = async (currentHero, skill, target) => {
    try {
      console.log('Exécution de la compétence avec animations:', { 
        hero: currentHero.name, 
        skill: skill.name, 
        position: skill.position,
        target: target.name 
      });

      // Si c'est la compétence position 2, déclencher l'animation vidéo
      if (skill.position === 2) {
        console.log('Déclenchement de l\'animation vidéo pour compétence position 2');
        
        setSkillAnimation({
          isVisible: true,
          heroCode: currentHero.name.toLowerCase().replace(/ /g, '-'),
          skillPosition: skill.position
        });

        // Attendre 3 secondes pour l'animation complète
        setTimeout(async () => {
          console.log('Fin de l\'animation vidéo, déclenchement des effets');
          setSkillAnimation(prev => ({ ...prev, isVisible: false }));
          
          // Ajouter les effets visuels
          addVisualEffects(skill, target);

          // Exécuter la vraie logique de compétence
          console.log('Exécution de la logique de compétence');
          useSkill(currentHero.id, skill.id, target.id);
        }, 3000);
      } else {
        // Pour les autres compétences (position 0, 1, etc.), ajouter les effets visuels directement
        console.log('Compétence sans animation vidéo, ajout des effets visuels directs');
        
        // Ajouter les effets visuels immédiatement
        addVisualEffects(skill, target);
        
        // Exécuter la vraie logique de compétence
        useSkill(currentHero.id, skill.id, target.id);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la compétence avec animations:', error);
      // En cas d'erreur, exécuter la compétence normalement
      useSkill(currentHero.id, skill.id, target.id);
    }
  };

  // Déterminer la classe de surbrillance pour les cibles
  const getHighlightClass = (participant) => {
    if (!selectedSkillId || !selectedSkillType) return '';
    
    // Vérifier si c'est un allié ou un ennemi en fonction de l'userId
    const isAlly = participant.userId === battleState.currentUserId;
    
    const shouldHighlight =
      (selectedSkillType === 'DAMAGE' && !isAlly) ||
      (selectedSkillType === 'HEAL' && isAlly);
    
    return shouldHighlight
      ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer'
      : 'brightness-75';
  };

  // Trouver l'index du prochain participant
  const getNextTurnIndex = () => {
    if (!battleState) return null;
    
    const total = battleState.participants.length;
    const currentIdx = battleState.currentTurnIndex;
    
    // Vérifier que l'index actuel est valide
    if (currentIdx < 0 || currentIdx >= total) {
      console.error("Index de tour actuel invalide:", currentIdx);
      return 0; // Retourner 0 par défaut
    }
    
    // Chercher le prochain participant vivant
    for (let i = 1; i < total * 2; i++) { // Multiplié par 2 pour être sûr de faire un tour complet
      const idx = (currentIdx + i) % total;
      
      // Vérifier que l'index calculé est valide
      if (idx < 0 || idx >= total) {
        console.error("Index calculé invalide:", idx);
        continue;
      }
      
      // Vérifier que le participant existe et est vivant
      const participant = battleState.participants[idx];
      if (participant && participant.currentHp > 0) {
        console.log("Prochain tour:", participant.name, "à l'index", idx);
        return idx;
      }
    }
    
    console.warn("Aucun participant vivant trouvé pour le prochain tour");
    return null;
  };

  // Si pas encore d'état de jeu
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

  // Préparation des données pour le rendu
  const currentHero = battleState.participants[battleState.currentTurnIndex];
  const currentUserId = battleState.currentUserId;
  
  console.log("RtaBattle - État de bataille:", {
    battleId: battleId,
    participants: battleState.participants,
    currentUserId: currentUserId,
    currentHero: currentHero,
    currentTurnIndex: battleState.currentTurnIndex
  });
  
  // Déterminer si c'est le tour du joueur actuel
  const isPlayerTurn = currentHero?.userId === currentUserId;
  const nextHeroId = battleState.participants[getNextTurnIndex()]?.id;
  
  // Séparer les participants en héros alliés et ennemis en fonction de leur appartenance
  // On utilise l'ID utilisateur pour identifier qui est allié et qui est ennemi
  
  // Les héros du joueur actuel (alliés)
  const myHeroes = battleState.participants
    .filter(p => p.userId === currentUserId && p.currentHp > 0);
    
  // Les héros de l'adversaire (ennemis)
  const enemyHeroes = battleState.participants
    .filter(p => p.userId !== currentUserId && p.currentHp > 0);
    
  console.log("RtaBattle - Héros alliés:", myHeroes);
  console.log("RtaBattle - Héros ennemis:", enemyHeroes);

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
        <HeroPortraitOverlay hero={currentHero} />
      </motion.div>

      {/* Barres d'ordre de tour avec cartes modernes - repositionnées */}
      <motion.div 
        className="absolute top-4 left-4 z-40 max-w-xs"
        variants={itemVariants}
      >
        <ModernCard className="p-3 backdrop-blur-md bg-white/10 border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <GiShield className="text-green-400 text-sm" />
            <span className="text-xs font-medium text-white">
              {t("allies", language) || "Alliés"}
            </span>
          </div>
          <TurnOrderBar
            participants={myHeroes}
            currentId={currentHero.id}
            nextId={nextHeroId}
          />
        </ModernCard>
      </motion.div>

      <motion.div 
        className="absolute top-4 right-4 z-40 max-w-xs"
        variants={itemVariants}
      >
        <ModernCard className="p-3 backdrop-blur-md bg-white/10 border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <GiBroadsword className="text-red-400 text-sm" />
            <span className="text-xs font-medium text-white">
              {t("enemies", language) || "Ennemis"}
            </span>
          </div>
          <TurnOrderBar
            participants={enemyHeroes}
            currentId={currentHero.id}
            nextId={nextHeroId}
          />
        </ModernCard>
      </motion.div>

      {/* Zone principale avec tous les participants - ajustée pour éviter les chevauchements */}
      <div className="absolute inset-0 flex items-center justify-between px-20 pt-20 pb-32">
        {/* Zone des héros alliés (à gauche) */}
        <motion.div 
          className="flex flex-col gap-8 items-start"
          variants={itemVariants}
        >
          <div className="flex gap-6">
            {myHeroes.length > 0 ? (
              myHeroes.map((hero, index) => (
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
                    isCurrent={hero.id === currentHero?.id}
                    isNext={hero.id === nextHeroId}
                    highlight={getHighlightClass(hero)}
                    isAlly={true}
                    onClick={async () => {
                      if (selectedSkillId && selectedSkillType === 'HEAL') {
                        console.log("Utilisation compétence sur allié:", { skillId: selectedSkillId, targetId: hero.id, hero });
                        const selectedSkill = currentHeroSkills.find(skill => skill.id === Number(selectedSkillId));
                        if (selectedSkill) {
                          await executeSkillWithAnimations(currentHero, selectedSkill, hero);
                        } else {
                          useSkill(currentHero.id, Number(selectedSkillId), Number(hero.id));
                        }
                      }
                    }}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div variants={itemVariants}>
                <ModernCard className="p-6 text-center">
                  <FaEye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-300">
                    {t("noAlliesFound", language) || "Aucun héros allié trouvé"}
                  </p>
                </ModernCard>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Zone des ennemis (à droite) */}
        <motion.div 
          className="flex flex-col gap-8 items-end"
          variants={itemVariants}
        >
          <div className="flex gap-6">
            {enemyHeroes.length > 0 ? (
              enemyHeroes.map((enemy, index) => (
                <motion.div 
                  key={enemy.id} 
                  ref={el => targetRefs.current[enemy.id] = el} 
                  className="battle-target"
                  variants={heroCardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <BattleHeroCard
                    hero={enemy}
                    isCurrent={enemy.id === currentHero?.id}
                    isNext={enemy.id === nextHeroId}
                    highlight={getHighlightClass(enemy)}
                    isEnemy={true}
                    onClick={async () => {
                      if (selectedSkillId && selectedSkillType === 'DAMAGE') {
                        console.log("Utilisation compétence sur ennemi:", { 
                          skillId: selectedSkillId, 
                          targetId: enemy.id, 
                          typeOfSkillId: typeof selectedSkillId,
                          typeOfTargetId: typeof enemy.id,
                          enemy 
                        });
                        const selectedSkill = currentHeroSkills.find(skill => skill.id === Number(selectedSkillId));
                        if (selectedSkill) {
                          await executeSkillWithAnimations(currentHero, selectedSkill, enemy);
                        } else {
                          useSkill(currentHero.id, Number(selectedSkillId), Number(enemy.id));
                        }
                      }
                    }}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div variants={itemVariants}>
                <ModernCard className="p-6 text-center">
                  <GiBroadsword className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-300">
                    {t("noEnemiesFound", language) || "Aucun héros ennemi trouvé"}
                  </p>
                </ModernCard>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Barre de compétences moderne (uniquement pour le tour du joueur) */}
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
                  {t("skills", language) || "Compétences"} - {currentHero?.name}
                </span>
              </div>
              <BattleSkillBar
                currentHero={currentHero}
                currentHeroSkills={currentHeroSkills}
                cooldowns={cooldowns}
                selectedSkillId={selectedSkillId}
                onSkillClick={handleSkillClick}
              />
            </ModernCard>
          </motion.div>
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
              onClick={onForfeit}
              icon={<FaSignOutAlt />}
              className="text-white font-medium"
            >
              {t("forfeit", language) || "Abandonner"}
            </ModernButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu déroulant pour les logs de développement - Masqué en production */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div 
          className="absolute bottom-4 left-4 z-40"
          variants={itemVariants}
        >
          {/* Bouton pour ouvrir/fermer le menu des logs */}
          <motion.button
            onClick={() => setShowDevLogs(!showDevLogs)}
            className={`mb-2 p-3 rounded-full backdrop-blur-md border transition-all duration-300 ${
              showDevLogs 
                ? 'bg-blue-500/30 border-blue-400/50 text-blue-300' 
                : 'bg-black/20 border-white/20 text-gray-400 hover:bg-black/30 hover:text-white'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-2">
              <FaBug className="w-4 h-4" />
              {showDevLogs ? (
                <FaChevronDown className="w-3 h-3" />
              ) : (
                <FaChevronUp className="w-3 h-3" />
              )}
            </div>
          </motion.button>

          {/* Menu déroulant des logs */}
          <AnimatePresence>
            {showDevLogs && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <ModernCard className="p-4 backdrop-blur-md bg-black/60 border-white/20 min-w-80 max-w-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaEye className="text-blue-400 text-sm" />
                      <span className="text-sm font-medium text-white">
                        {t("battleLog", language) || "Journal de combat"} (DEV)
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {battleState?.logs?.length || 0} entrées
                    </span>
                  </div>
                  
                  {/* Zone de logs avec scroll */}
                  <div className="max-h-60 overflow-y-auto text-xs space-y-1 custom-scrollbar">
                    <AnimatePresence>
                      {battleState?.logs?.length > 0 ? (
                        battleState.logs.slice(-10).map((log, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: i * 0.05 }}
                            className="text-gray-200 bg-black/30 rounded px-3 py-2 hover:bg-black/50 transition-colors"
                          >
                            <span className="text-gray-400 text-xs">
                              [{new Date().toLocaleTimeString()}]
                            </span>
                            <br />
                            {log}
                          </motion.div>
                        ))
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center text-gray-400 py-4"
                        >
                          <FaEye className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p>Aucun log disponible</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Bouton pour vider les logs */}
                  {battleState?.logs?.length > 0 && (
                    <motion.button
                      onClick={() => {
                        if (battleState.logs) {
                          battleState.logs.length = 0;
                        }
                      }}
                      className="mt-3 w-full py-2 px-3 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded border border-red-500/30 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Vider les logs
                    </motion.button>
                  )}
                </ModernCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Composants d'animation */}
      <AnimatePresence>
        {skillAnimation.isVisible && (
          <SkillAnimation
            heroCode={skillAnimation.heroCode}
            skillPosition={skillAnimation.skillPosition}
            isVisible={skillAnimation.isVisible}
            onAnimationEnd={() => setSkillAnimation(prev => ({ ...prev, isVisible: false }))}
          />
        )}
      </AnimatePresence>

      {/* Dégâts flottants */}
      <AnimatePresence>
        {floatingDamages.map(damage => (
          <FloatingDamage
            key={damage.id}
            value={damage.value}
            x={damage.position.x}
            y={damage.position.y}
            type={damage.type}
            onAnimationEnd={() => setFloatingDamages(prev => prev.filter(d => d.id !== damage.id))}
          />
        ))}
      </AnimatePresence>

      {/* Effets d'attaque */}
      <AnimatePresence>
        {attackEffects.map(effect => (
          <AttackEffect
            key={effect.id}
            type={effect.type}
            x={effect.position.x}
            y={effect.position.y}
            isVisible={true}
            onAnimationEnd={() => setAttackEffects(prev => prev.filter(e => e.id !== effect.id))}
          />
        ))}
      </AnimatePresence>

      {/* Particules de bataille */}
      <AnimatePresence>
        {battleParticles.map(particle => (
          <BattleParticles
            key={particle.id}
            type={particle.type}
            x={particle.position.x}
            y={particle.position.y}
            isVisible={true}
            onAnimationEnd={() => setBattleParticles(prev => prev.filter(p => p.id !== particle.id))}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
