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

  // Mettre à jour les compétences du héros actuel lorsque le battleState change
  useEffect(() => {
    if (!battleState) return;
    
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    const isPlayerTurn = currentHero.player;
    
    // Charger les compétences si c'est au tour du joueur
    if (isPlayerTurn) {
      const fetchHeroSkills = async () => {
        try {
          const res = await API.get(`/player-hero/${currentHero.id}/skills`);
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
      if (defaultTarget) useSkill(skill.id, defaultTarget.id);
    } else {
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
    }
  };

  // Déterminer la classe de surbrillance pour les cibles
  const getHighlightClass = (participant) => {
    if (!selectedSkillId || !selectedSkillType) return '';
    const shouldHighlight =
      (selectedSkillType === 'DAMAGE' && !participant.player) ||
      (selectedSkillType === 'HEAL' && participant.player);
    
    return shouldHighlight
      ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer'
      : 'brightness-75';
  };

  // Trouver l'index du prochain participant
  const getNextTurnIndex = () => {
    if (!battleState) return null;
    
    const total = battleState.participants.length;
    for (let i = 1; i < total; i++) {
      const idx = (battleState.currentTurnIndex + i) % total;
      if (battleState.participants[idx].currentHp > 0) return idx;
    }
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
  const isPlayerTurn = currentHero.player;
  const nextHeroId = battleState.participants[getNextTurnIndex()]?.id;
  
  // Séparer les participants en joueurs et ennemis
  const players = battleState.participants.filter(p => p.player && p.currentHp > 0);
  const enemies = battleState.participants.filter(p => !p.player && p.currentHp > 0);

  return (
    <div className="relative h-screen w-screen bg-[url('/arena.webp')] bg-cover bg-center text-white overflow-hidden">
      {/* Portrait du héros actuel */}
      <HeroPortraitOverlay hero={currentHero} />

      {/* Barres d'ordre de tour */}
      <div className="absolute top-20 left-0 z-40 pl-4">
        <TurnOrderBar
          participants={players}
          currentId={currentHero.id}
          nextId={nextHeroId}
        />
      </div>

      <div className="absolute top-20 right-0 z-40 pr-4">
        <TurnOrderBar
          participants={enemies}
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
            {players.map(hero => (
              <div key={hero.id} ref={el => targetRefs.current[hero.id] = el} className="battle-target">
                <BattleHeroCard
                  hero={hero}
                  isCurrent={hero.id === currentHero.id}
                  isNext={hero.id === nextHeroId}
                  highlight={getHighlightClass(hero)}
                  onClick={() => selectedSkillId && selectedSkillType === 'HEAL' && useSkill(selectedSkillId, hero.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Zone des ennemis (à droite) */}
        <div className="flex flex-col gap-12 items-end">
          {/* Héros ennemis - maintenant avec seulement 2 héros par joueur */}
          <div className="flex gap-8">
            {enemies.map(enemy => (
              <div key={enemy.id} ref={el => targetRefs.current[enemy.id] = el} className="battle-target">
                <BattleHeroCard
                  hero={enemy}
                  isCurrent={enemy.id === currentHero.id}
                  isNext={enemy.id === nextHeroId}
                  highlight={getHighlightClass(enemy)}
                  onClick={() => selectedSkillId && selectedSkillType === 'DAMAGE' && useSkill(selectedSkillId, enemy.id)}
                />
              </div>
            ))}
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