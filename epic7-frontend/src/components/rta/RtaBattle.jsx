import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BattleHeroCard from '../battle/BattleHeroCard';
import BattleSkillBar from '../battle/BattleSkillBar';
import BattleForfeitButton from '../battle/BattleForfeitButton';
import HeroPortraitOverlay from '../battle/HeroPortraitOverlay';
import TurnOrderBar from '../battle/TurnOrderBar';
import API from '../../api/axiosInstance';

export default function RtaBattle({ battleState, battleId, useSkill, onForfeit }) {
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [cooldowns, setCooldowns] = useState({});
  const targetRefs = useRef({});

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

  // Gérer le clic sur une compétence
  const handleSkillClick = (skill) => {
    if (skill.category === 'PASSIVE') return;
    
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    const cooldownLeft = cooldowns?.[currentHero?.id]?.[skill.id] || 0;
    
    if (cooldownLeft > 0) return;
    
    if (selectedSkillId === skill.id) {
      const defaultTarget = battleState.participants.find(p => skill.action === 'HEAL' ? p.player : !p.player);
      if (defaultTarget) useSkill(currentHero.id, skill.id, defaultTarget.id);
    } else {
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
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
      <div className="h-screen w-screen bg-[url('/arena.webp')] bg-cover bg-center flex items-center justify-center text-white">
        <div className="text-2xl font-bold animate-pulse">Chargement du combat...</div>
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
    <div className="relative h-screen w-screen bg-[url('/arena.webp')] bg-cover bg-center text-white overflow-hidden">
      {/* Portrait du héros actuel */}
      <HeroPortraitOverlay hero={currentHero} />

      {/* Barres d'ordre de tour */}
      <div className="absolute top-20 left-0 z-40 pl-4">
        <TurnOrderBar
          participants={myHeroes}
          currentId={currentHero.id}
          nextId={nextHeroId}
        />
      </div>

      <div className="absolute top-20 right-0 z-40 pr-4">
        <TurnOrderBar
          participants={enemyHeroes}
          currentId={currentHero.id}
          nextId={nextHeroId}
        />
      </div>

      {/* Zone principale avec tous les participants */}
      <div className="absolute inset-0 flex items-center justify-between px-20">
        {/* Zone des héros alliés (à gauche) */}
        <div className="flex flex-col gap-12 items-start">
          {/* Héros alliés - maintenant avec seulement 2 héros par joueur */}
          <div className="flex gap-8">
            {myHeroes.length > 0 ? (
              myHeroes.map(hero => (
                <div key={hero.id} ref={el => targetRefs.current[hero.id] = el} className="battle-target">
                  <BattleHeroCard
                    hero={hero}
                    isCurrent={hero.id === currentHero?.id}
                    isNext={hero.id === nextHeroId}
                    highlight={getHighlightClass(hero)}
                    isAlly={true}  // Indique explicitement que c'est un allié
                    onClick={() => {
                      if (selectedSkillId && selectedSkillType === 'HEAL') {
                        console.log("Utilisation compétence sur allié:", { skillId: selectedSkillId, targetId: hero.id, hero });
                        // S'assurer que l'ID est traité comme un nombre et inclure l'ID du héros actuel (currentHero.id)
                        useSkill(currentHero.id, Number(selectedSkillId), Number(hero.id));
                      }
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-white text-lg">Aucun héros allié trouvé</div>
            )}
          </div>
        </div>

        {/* Zone des ennemis (à droite) */}
        <div className="flex flex-col gap-12 items-end">
          {/* Héros ennemis - maintenant avec seulement 2 héros par joueur */}
          <div className="flex gap-8">
            {enemyHeroes.length > 0 ? (
              enemyHeroes.map(enemy => (
                <div key={enemy.id} ref={el => targetRefs.current[enemy.id] = el} className="battle-target">
                  <BattleHeroCard
                    hero={enemy}
                    isCurrent={enemy.id === currentHero?.id}
                    isNext={enemy.id === nextHeroId}
                    highlight={getHighlightClass(enemy)}
                    isEnemy={true}  // Indique explicitement que c'est un ennemi
                    onClick={() => {
                      if (selectedSkillId && selectedSkillType === 'DAMAGE') {
                        console.log("Utilisation compétence sur ennemi:", { 
                          skillId: selectedSkillId, 
                          targetId: enemy.id, 
                          typeOfSkillId: typeof selectedSkillId,
                          typeOfTargetId: typeof enemy.id,
                          enemy 
                        });
                        // S'assurer que l'ID est traité comme un nombre et inclure l'ID du héros actuel (currentHero.id)
                        useSkill(currentHero.id, Number(selectedSkillId), Number(enemy.id));
                      }
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-white text-lg">Aucun héros ennemi trouvé</div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de compétences (uniquement pour le tour du joueur) */}
      {isPlayerTurn && currentHeroSkills.length > 0 && (
        <div
          id="skill-bar"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30"
        >
          <BattleSkillBar
            currentHero={currentHero}
            currentHeroSkills={currentHeroSkills}
            cooldowns={cooldowns}
            selectedSkillId={selectedSkillId}
            onSkillClick={handleSkillClick}
          />
        </div>
      )}

      {/* Bouton d'abandon */}
      {isPlayerTurn && !battleState.finished && (
        <div className="absolute bottom-4 right-4 z-50">
          <BattleForfeitButton onClick={onForfeit} />
        </div>
      )}

      {/* Affichage des logs de bataille */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-black/60 p-3 rounded-lg backdrop-blur-sm">
        <div className="max-h-24 overflow-y-auto text-sm text-gray-200">
          {battleState.logs.slice(-5).map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
