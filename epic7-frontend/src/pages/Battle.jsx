// Nouveau layout visuel pour combat Epic Seven-style
// Tu peux déplacer les composants si besoin dans un dossier `components/battle`

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import BattleHeroCard from '../components/battle/BattleHeroCard';
import BattleSkillBar from '../components/battle/BattleSkillBar';
import BattleEndOverlay from '../components/battle/BattleEndOverlay';
import BattleForfeitButton from '../components/battle/BattleForfeitButton';
import FloatingDamage from '../components/battle/FloatingDamage';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel';
import HeroPortraitOverlay from '../components/battle/HeroPortraitOverlay';
import TurnOrderBar from '../components/battle/TurnOrderBar';

export default function Battle() {
  // --- ÉTATS (STATES) ---
  
  // États de la phase de sélection des héros
  const [selectionPhase, setSelectionPhase] = useState(true); // Indique si on est en phase de sélection de héros
  const [availableHeroes, setAvailableHeroes] = useState([]); // Liste des héros disponibles pour le joueur
  const [selectedHeroes, setSelectedHeroes] = useState([null, null, null, null]); // Héros sélectionnés par le joueur (max 4)

  // États du combat
  const [battleState, setBattleState] = useState(null); // État général du combat (participants, tours, etc.)
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]); // Compétences du héros dont c'est le tour
  const [selectedSkillId, setSelectedSkillId] = useState(null); // ID de la compétence sélectionnée
  const [selectedSkillType, setSelectedSkillType] = useState(null); // Type de la compétence (DAMAGE, HEAL, etc.)
  const [cooldowns, setCooldowns] = useState({}); // Périodes de recharge des compétences
  const [floatingDamages, setFloatingDamages] = useState([]); // Animations de dégâts flottants
  const [loading, setLoading] = useState(false); // Indicateur de chargement
  const [bossAttacking, setBossAttacking] = useState(false); // Indique si un boss est en train d'attaquer

  const navigate = useNavigate();
  const targetRefs = useRef({}); // Références aux éléments DOM des cibles pour positionner les animations de dégâts

  // Récupère les héros disponibles au montage du composant
  useEffect(() => { fetchAvailableHeroes(); }, []);

  // --- FONCTIONS DE RÉCUPÉRATION DE DONNÉES ---

  // Récupère les héros disponibles depuis l'API
  const fetchAvailableHeroes = async () => {
    try {
      const res = await API.get('/player-hero/my');
      setAvailableHeroes(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des héros :", error);
    }
  };

  // --- FONCTIONS DE GESTION DU COMBAT ---

  // Démarre le combat avec les héros sélectionnés
  const startCombat = async () => {
    try {
      // Filtre les héros sélectionnés non-null et extrait leurs IDs
      const heroIds = selectedHeroes.filter(Boolean).map(h => h.id);
      // Envoie la requête pour démarrer le combat avec le boss et les héros sélectionnés
      await API.post('/combat/start', {
        bossHeroId: 1, // ID du boss (fixé à 1 pour l'instant)
        selectedPlayerHeroIds: heroIds
      });
      // Récupère l'état initial du combat
      await fetchBattleState();
      // Passe à la phase de combat
      setSelectionPhase(false);
    } catch (error) {
      console.error('Erreur au démarrage du combat :', error);
    }
  };

  // Récupère l'état actuel du combat depuis l'API
  const fetchBattleState = async () => {
    const res = await API.get('/combat/state');
    const state = res.data;
    setBattleState(state);
    setCooldowns(state.cooldowns || {});
    const currentHero = state.participants[state.currentTurnIndex];

    // Si c'est au tour d'un boss de jouer et que le combat n'est pas terminé
    if (!currentHero.player && !state.finished) {
      // Déclenche l'animation d'attaque du boss
      setBossAttacking(true);
      // Attend un délai pour que le joueur voie le boss se préparer
      setTimeout(() => {
        handleBossAction(currentHero.id);
      }, 1500);
    } else {
      // Si c'est au tour d'un héros joueur, récupère ses compétences
      if (currentHero.player) {
        const skillsRes = await API.get(`/player-hero/${currentHero.id}/skills`);
        setCurrentHeroSkills(skillsRes.data);
      } else {
        setCurrentHeroSkills([]);
      }
      // Réinitialise la sélection de compétence
      setSelectedSkillId(null);
      setSelectedSkillType(null);
    }
  };

  // Gère l'action automatique du boss
  const handleBossAction = async (bossId) => {
    try {
      // Envoie une requête pour que le boss effectue son action
      const res = await API.post('/combat/action/boss', { bossId });
      const { damageDealt, targetId, type, battleState: newState } = res.data;
      
      // Met à jour l'état du combat avec les résultats
      setBattleState(newState);
      setCooldowns(newState.cooldowns || {});
      setBossAttacking(false);

      // Prépare le tour du prochain héros
      const newCurrentHero = newState.participants[newState.currentTurnIndex];
      if (newCurrentHero.player) {
        const skillsRes = await API.get(`/player-hero/${newCurrentHero.id}/skills`);
        setCurrentHeroSkills(skillsRes.data);
      } else {
        setCurrentHeroSkills([]);
      }

      // Affiche l'animation de dégâts si nécessaire
      if (damageDealt && targetId) {
        const targetElement = targetRefs.current[targetId];
        if (targetElement) {
          // Calcule la position pour l'animation de dégâts
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top;
          const floatingId = Date.now();
          
          // Ajoute l'animation de dégâts
          setFloatingDamages(prev => [...prev, { id: floatingId, x, y, value: damageDealt, type }]);
          
          // Retire l'animation après un délai
          setTimeout(() => {
            setFloatingDamages(prev => prev.filter(d => d.id !== floatingId));
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'action du boss :", error);
      setBossAttacking(false);
    }
  };

  // Utilise une compétence sur une cible
  const useSkill = async (targetId) => {
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    try {
      // Envoie une requête pour utiliser la compétence sélectionnée
      const res = await API.post('/combat/action/skill', {
        playerHeroId: currentHero.id,
        skillId: selectedSkillId,
        targetId,
      });
      
      // Traite les résultats de l'action
      const { damageDealt, targetId: resultTargetId, type, battleState: newState } = res.data;
      setBattleState(newState);
      setCooldowns(newState.cooldowns || {});

      // Détermine qui joue ensuite
      const newCurrentHero = newState.participants[newState.currentTurnIndex];
      
      // Si c'est au tour d'un boss, lance son action après un délai
      if (!newCurrentHero.player && !newState.finished) {
        setBossAttacking(true);
        setTimeout(() => {
          handleBossAction(newCurrentHero.id);
        }, 1500);
      } else {
        // Sinon, prépare le tour du héros
        if (newCurrentHero.player) {
          const skillsRes = await API.get(`/player-hero/${newCurrentHero.id}/skills`);
          setCurrentHeroSkills(skillsRes.data);
        } else {
          setCurrentHeroSkills([]);
        }
      }

      // Affiche l'animation de dégâts si nécessaire
      if (damageDealt && resultTargetId) {
        const targetElement = targetRefs.current[resultTargetId];
        if (targetElement) {
          // Calcule la position pour l'animation
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top;
          const floatingId = Date.now();
          
          // Ajoute l'animation
          setFloatingDamages(prev => [...prev, { id: floatingId, x, y, value: damageDealt, type }]);
          
          // Retire l'animation après un délai
          setTimeout(() => {
            setFloatingDamages(prev => prev.filter(d => d.id !== floatingId));
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'utilisation de la compétence :", error);
    }
  };

  // Gère le clic sur une compétence
  const handleSkillClick = (skill) => {
    // Ignore les compétences passives
    if (skill.category === 'PASSIVE') return;
    
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    // Vérifie si la compétence est en recharge
    const cooldownLeft = cooldowns?.[currentHero?.id]?.[skill.id] || 0;
    if (cooldownLeft > 0) return;
    
    // Si la compétence est déjà sélectionnée, essaie de l'utiliser sur une cible par défaut
    if (selectedSkillId === skill.id) {
      const defaultTarget = battleState.participants.find(p => skill.action === 'HEAL' ? p.player : !p.player);
      if (defaultTarget) useSkill(defaultTarget.id);
    } else {
      // Sinon, sélectionne cette compétence
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
    }
  };

  // Détermine la classe CSS de mise en évidence pour une cible potentielle
  const getHighlightClass = (participant) => {
    if (!selectedSkillId || !selectedSkillType) return '';
    const shouldHighlight =
      (selectedSkillType === 'DAMAGE' && !participant.player) ||
      (selectedSkillType === 'HEAL' && participant.player);
      return shouldHighlight
      ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer'
      : 'brightness-75';
  };

  // Désélectionne la compétence si on clique en dehors de la barre de compétences ou d'une cible
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Détermine l'index du prochain participant qui jouera
  const getNextTurnIndex = () => {
    const total = battleState.participants.length;
    for (let i = 1; i < total; i++) {
      const idx = (battleState.currentTurnIndex + i) % total;
      // Vérifie que le participant est toujours en vie
      if (battleState.participants[idx].currentHp > 0) return idx;
    }
    return null;
  };

  // --- RENDU CONDITIONNEL ---

  // Affiche le panneau de sélection des héros si on est en phase de sélection
  if (selectionPhase) {
    return <HeroSelectionPanel availableHeroes={availableHeroes} selectedHeroes={selectedHeroes} setSelectedHeroes={setSelectedHeroes} onStart={startCombat} />;
  }

  // Affiche un message de chargement si l'état du combat n'est pas encore disponible
  if (!battleState) return <div className="text-center text-white mt-12 text-xl animate-pulse">Chargement du combat...</div>;

  // --- PRÉPARATION DES DONNÉES POUR LE RENDU ---
  
  const currentHero = battleState.participants[battleState.currentTurnIndex];
  const isPlayerTurn = currentHero?.player;
  const nextHeroId = battleState.participants[getNextTurnIndex()]?.id;

  // Sépare les participants en joueurs et ennemis (seulement ceux encore en vie)
  const players = battleState.participants.filter(p => p.player && p.currentHp > 0);
  const enemies = battleState.participants.filter(p => !p.player && p.currentHp > 0);

  // --- RENDU PRINCIPAL ---
  
  return (
    <div className="relative h-screen w-screen bg-[url('epic7-frontend/public/arena.webp')] bg-cover bg-center text-white overflow-hidden">
      {/* Affiche le portrait du héros dont c'est le tour */}
      <HeroPortraitOverlay hero={currentHero} />

      {/* Affiche une notification quand le boss attaque */}
      {bossAttacking && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <div className="bg-red-500/30 p-4 rounded-lg text-2xl font-bold animate-pulse">
            {currentHero.name} se prépare à attaquer...
          </div>
        </div>
      )}

      {/* Barre d'ordre de tour pour les alliés (à gauche) */}
      <div className="absolute top-20 left-0 z-40 pl-4">
        <TurnOrderBar
          participants={players}
          currentId={currentHero.id}
          nextId={battleState.participants[getNextTurnIndex()]?.id}
        />
      </div>

      {/* Barre d'ordre de tour pour les ennemis (à droite) */}
      <div className="absolute top-20 right-0 z-40 pr-4">
        <TurnOrderBar
          participants={enemies}
          currentId={currentHero.id}
          nextId={battleState.participants[getNextTurnIndex()]?.id}
        />
      </div>

      {/* Zone principale avec les héros et ennemis */}
      <div className="absolute inset-0 flex items-center justify-between px-20">
        {/* Zone des héros alliés (à gauche) */}
        <div className="flex flex-col gap-12 items-start">
          {/* Première ligne d'alliés (positions 0-1) */}
          <div className="flex gap-8">
            {players.slice(0, 2).map(hero => (
              <div key={hero.id} ref={el => targetRefs.current[hero.id] = el} className="battle-target"> 
                <BattleHeroCard 
                  hero={hero} 
                  isCurrent={hero.id === currentHero.id} 
                  isNext={hero.id === nextHeroId} 
                  highlight={getHighlightClass(hero)} 
                  onClick={() => selectedSkillId && selectedSkillType === 'HEAL' && useSkill(hero.id)} 
                />
              </div>
            ))}
          </div>
          {/* Seconde ligne d'alliés (positions 2-3) */}
          <div className="flex gap-8">
            {players.slice(2).map(hero => (
              <div key={hero.id} ref={el => targetRefs.current[hero.id] = el} className="battle-target">
                <BattleHeroCard 
                  hero={hero} 
                  isCurrent={hero.id === currentHero.id} 
                  isNext={hero.id === nextHeroId} 
                  highlight={getHighlightClass(hero)} 
                  onClick={() => selectedSkillId && selectedSkillType === 'HEAL' && useSkill(hero.id)} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Zone des ennemis (à droite) */}
        <div className="flex flex-col gap-12 items-end">
          {/* Première ligne d'ennemis (positions 0-1) */}
          <div className="flex gap-8">
            {enemies.slice(0, 2).map(boss => (
              <div key={boss.id} ref={el => targetRefs.current[boss.id] = el} className="battle-target">
                <BattleHeroCard 
                  hero={boss} 
                  isCurrent={boss.id === currentHero.id} 
                  highlight={getHighlightClass(boss)} 
                  onClick={() => selectedSkillId && selectedSkillType === 'DAMAGE' && useSkill(boss.id)} 
                />
              </div>
            ))}
          </div>
          {/* Seconde ligne d'ennemis (positions 2-3) */}
          <div className="flex gap-8">
            {enemies.slice(2).map(boss => (
              <div key={boss.id} ref={el => targetRefs.current[boss.id] = el} className="battle-target">
                <BattleHeroCard 
                  hero={boss} 
                  isCurrent={boss.id === currentHero.id} 
                  highlight={getHighlightClass(boss)} 
                  onClick={() => selectedSkillId && selectedSkillType === 'DAMAGE' && useSkill(boss.id)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barre de compétences (visible uniquement quand c'est au tour du joueur) */}
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

      {/* Animations de dégâts flottants */}
      {floatingDamages.map(fd => (<FloatingDamage key={fd.id} {...fd} />))}

      {/* Overlay de fin de combat (victoire ou défaite) */}
      {battleState.finished && (
        <BattleEndOverlay 
          status={battleState.logs.some(log => log.includes("Victoire")) ? "VICTOIRE" : "DÉFAITE"} 
          onReturn={() => navigate("/dashboard")} 
        />
      )}

      {/* Bouton d'abandon du combat */}
      {!battleState.finished && (
  <BattleForfeitButton onClick={() => navigate("/dashboard")} />
)}

    </div>
  );
}
