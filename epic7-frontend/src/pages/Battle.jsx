import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import BattleHeroCard from '../components/battle/BattleHeroCard';
import BattleCombatLog from '../components/battle/BattleCombatLog';
import BattleSkillBar from '../components/battle/BattleSkillBar';
import BattleEndOverlay from '../components/battle/BattleEndOverlay';
import BattleForfeitButton from '../components/battle/BattleForfeitButton';
import FloatingDamage from '../components/battle/FloatingDamage';
import HeroSelectionPanel from '../components/battle/battleSelection/HeroSelectionPanel'; 

export default function Battle() {
  const [selectionPhase, setSelectionPhase] = useState(true);
  const [availableHeroes, setAvailableHeroes] = useState([]);
  const [selectedHeroes, setSelectedHeroes] = useState([null, null, null, null]);

  const [battleState, setBattleState] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [floatingDamages, setFloatingDamages] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const targetRefs = useRef({});

  useEffect(() => {
    fetchAvailableHeroes();
  }, []);

  const fetchAvailableHeroes = async () => {
    try {
      const res = await API.get('/player-hero/my');
      setAvailableHeroes(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des héros :", error);
    }
  };

  const toggleHeroSelection = (hero) => {
    if (selectedHeroes.some(h => h.id === hero.id)) {
      setSelectedHeroes(prev => prev.filter(h => h.id !== hero.id));
    } else if (selectedHeroes.length < 4) {
      setSelectedHeroes(prev => [...prev, hero]);
    }
  };

  const startCombat = async () => {
    try {
      const heroIds = selectedHeroes
        .filter(Boolean) // ignore slots vides
        .map(h => h.id);
        
      await API.post('/combat/start', {
        bossHeroId: 1,
        selectedPlayerHeroIds: heroIds
      });
  
      await fetchBattleState();
      setSelectionPhase(false);
    } catch (error) {
      console.error('Erreur au démarrage du combat :', error);
    }
  };
  

  const fetchBattleState = async () => {
    const res = await API.get('/combat/state');
    const state = res.data;
    setBattleState(state);
    setCooldowns(state.cooldowns || {});

    const currentHero = state.participants[state.currentTurnIndex];
    if (currentHero.player) {
      const skillsRes = await API.get(`/player-hero/${currentHero.id}/skills`);
      setCurrentHeroSkills(skillsRes.data);
    } else {
      setCurrentHeroSkills([]);
    }

    setSelectedSkillId(null);
    setSelectedSkillType(null);
  };

  const useSkill = async (targetId) => {
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    try {
      const res = await API.post('/combat/action/skill', {
        playerHeroId: currentHero.id,
        skillId: selectedSkillId,
        targetId,
      });

      const { damageDealt, targetId: resultTargetId, type, battleState: newState } = res.data;
      setBattleState(newState);
      setCooldowns(newState.cooldowns || {});

      const newCurrentHero = newState.participants[newState.currentTurnIndex];
      if (newCurrentHero.player) {
        const skillsRes = await API.get(`/player-hero/${newCurrentHero.id}/skills`);
        setCurrentHeroSkills(skillsRes.data);
      } else {
        setCurrentHeroSkills([]);
      }

      if (damageDealt && resultTargetId) {
        const targetElement = targetRefs.current[resultTargetId];
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top;
          const floatingId = Date.now();

          setFloatingDamages(prev => [...prev, { id: floatingId, x, y, value: damageDealt, type }]);
          setTimeout(() => {
            setFloatingDamages(prev => prev.filter(d => d.id !== floatingId));
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'utilisation de la compétence :", error);
    }
  };

  const handleSkillClick = (skill) => {
    if (skill.category === 'PASSIVE') return;

    const currentHero = battleState.participants[battleState.currentTurnIndex];
    const cooldownLeft = cooldowns?.[currentHero?.id]?.[skill.id] || 0;
    if (cooldownLeft > 0) return;

    if (selectedSkillId === skill.id) {
      const defaultTarget = battleState.participants.find(p =>
        skill.action === 'HEAL' ? p.player : !p.player
      );
      if (defaultTarget) useSkill(defaultTarget.id);
    } else {
      setSelectedSkillId(skill.id);
      setSelectedSkillType(skill.action);
    }
  };

  const getHighlightClass = (participant) => {
    if (!selectedSkillId || !selectedSkillType) return '';
    const shouldHighlight =
      (selectedSkillType === 'DAMAGE' && !participant.player) ||
      (selectedSkillType === 'HEAL' && participant.player);

    return shouldHighlight
      ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer'
      : 'opacity-50 pointer-events-none';
  };

  const getEndStatus = () => {
    if (!battleState?.finished) return null;
    return battleState.logs.some(log => log.includes("Victoire")) ? "VICTOIRE" : "DÉFAITE";
  };

  const navigateToDashboard = () => navigate("/dashboard");

  if (selectionPhase) {
    return (
      <HeroSelectionPanel
        availableHeroes={availableHeroes}
        selectedHeroes={selectedHeroes}
        setSelectedHeroes={setSelectedHeroes}
        onStart={startCombat}
      />
    );
  }
  

  if (!battleState) {
    return <div className="text-center text-white mt-12 text-xl animate-pulse">Chargement du combat...</div>;
  }

  const currentHero = battleState.participants[battleState.currentTurnIndex];
  const isPlayerTurn = currentHero?.player;

  const getNextTurnIndex = () => {
    const total = battleState.participants.length;
    for (let i = 1; i < total; i++) {
      const idx = (battleState.currentTurnIndex + i) % total;
      if (battleState.participants[idx].currentHp > 0) return idx;
    }
    return null;
  };

  const nextHeroId = battleState.participants[getNextTurnIndex()]?.id;

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white overflow-hidden">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-xl bg-gray-800/80 text-white shadow-lg border border-gray-600 text-lg font-bold z-50">
        🌀 Tour : {battleState.roundCount}
      </div>

      <div className="grid grid-cols-5 gap-2 h-full p-4">
        <div className="flex flex-col justify-center items-center gap-4 col-span-1">
          {battleState.participants.filter(p => p.player).map(hero => (
            <div key={hero.id} ref={el => targetRefs.current[hero.id] = el}>
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

        <div className="col-span-3 bg-black/40 rounded-xl shadow-lg border border-gray-700 px-6 py-4 backdrop-blur overflow-y-auto">
          <BattleCombatLog logs={battleState.logs} />
        </div>

        <div className="flex flex-col justify-center items-center gap-4 col-span-1">
          {battleState.participants.filter(p => !p.player).map(boss => (
            <div key={boss.id} ref={el => targetRefs.current[boss.id] = el}>
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

      {isPlayerTurn && currentHeroSkills.length > 0 && (
        <BattleSkillBar
          currentHero={currentHero}
          currentHeroSkills={currentHeroSkills}
          cooldowns={cooldowns}
          selectedSkillId={selectedSkillId}
          onSkillClick={handleSkillClick}
        />
      )}

      {battleState.finished && (
        <BattleEndOverlay status={getEndStatus()} onReturn={navigateToDashboard} />
      )}

      {floatingDamages.map(fd => (
        <FloatingDamage key={fd.id} {...fd} />
      ))}

      <BattleForfeitButton onClick={navigateToDashboard} />
    </div>
  );
}
