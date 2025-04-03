import React, { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { useNavigate } from "react-router-dom";

import BattleHeroCard from '../components/battle/BattleHeroCard';
import BattleCombatLog from '../components/battle/BattleCombatLog';
import BattleSkillBar from '../components/battle/BattleSkillBar';
import BattleEndOverlay from '../components/battle/BattleEndOverlay';
import BattleForfeitButton from '../components/battle/BattleForfeitButton';

export default function Battle() {
  const navigate = useNavigate();
  const [battleState, setBattleState] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [cooldowns, setCooldowns] = useState({});

  useEffect(() => {
    startCombat();
  }, []);

  const startCombat = async () => {
    try {
      await axios.post('/combat/start', { bossHeroId: 1 });
      fetchBattleState();
    } catch (error) {
      console.error('Erreur au démarrage du combat :', error);
    }
  };

  const fetchBattleState = async () => {
    const res = await axios.get('/combat/state');
    setBattleState(res.data);
    setCooldowns(res.data.cooldowns || {});

    const currentHero = res.data.participants[res.data.currentTurnIndex];
    if (currentHero.player) {
      const skillsRes = await axios.get(`player-hero/${currentHero.id}/skills`);
      setCurrentHeroSkills(skillsRes.data);
    }

    setSelectedSkillId(null);
    setSelectedSkillType(null);
    setLoading(false);
  };

  const useSkill = async (targetId) => {
    const currentHero = battleState.participants[battleState.currentTurnIndex];
    await axios.post('/combat/action/skill', {
      playerHeroId: currentHero.id,
      skillId: selectedSkillId,
      targetId,
    });
    fetchBattleState();
  };

  const handleSkillClick = (skill) => {
    if (skill.category === 'PASSIVE') return;
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
    const shouldHighlight = (selectedSkillType === 'DAMAGE' && !participant.player) ||
                             (selectedSkillType === 'HEAL' && participant.player);
    return shouldHighlight ? 'animate-pulse ring-4 ring-blue-500 cursor-pointer' : 'opacity-50 pointer-events-none';
  };

  const getEndStatus = () => {
    if (!battleState?.finished) return null;
    return battleState.logs.some(log => log.includes("Victoire")) ? "VICTOIRE" : "DÉFAITE";
  };

  const navigateToDashboard = () => navigate("/dashboard");

  if (loading || !battleState) return <div className="text-center text-white mt-12 text-xl animate-pulse">Chargement du combat...</div>;

  const currentHero = battleState.participants[battleState.currentTurnIndex];
  const isPlayerTurn = currentHero?.player;

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white overflow-hidden">
      <div className="grid grid-cols-5 gap-2 h-full p-4">
        {/* Alliés */}
        <div className="flex flex-col justify-center items-center gap-4 col-span-1">
          {battleState.participants.filter(p => p.player).map(hero => (
            <BattleHeroCard
              key={hero.id}
              hero={hero}
              isCurrent={hero.id === currentHero.id}
              highlight={getHighlightClass(hero)}
              onClick={() => selectedSkillId && selectedSkillType === 'HEAL' && useSkill(hero.id)}
            />
          ))}
        </div>

        {/* Log de combat */}
        <div className="col-span-3 bg-black/40 rounded-xl shadow-lg border border-gray-700 px-6 py-4 backdrop-blur overflow-y-auto">
          <BattleCombatLog logs={battleState.logs} />
        </div>

        {/* Ennemis */}
        <div className="flex flex-col justify-center items-center gap-4 col-span-1">
          {battleState.participants.filter(p => !p.player).map(boss => (
            <BattleHeroCard
              key={boss.id}
              hero={boss}
              isCurrent={boss.id === currentHero.id}
              highlight={getHighlightClass(boss)}
              onClick={() => selectedSkillId && selectedSkillType === 'DAMAGE' && useSkill(boss.id)}
            />
          ))}
        </div>
      </div>

      {/* Compétences */}
      {isPlayerTurn && (
        <BattleSkillBar
          currentHero={currentHero}
          currentHeroSkills={currentHeroSkills}
          cooldowns={cooldowns}
          selectedSkillId={selectedSkillId}
          onSkillClick={handleSkillClick}
        />
      )}

      {/* Fin du combat */}
      {battleState.finished && (
        <BattleEndOverlay status={getEndStatus()} onReturn={navigateToDashboard} />
      )}

      {/* Bouton abandon */}
      <BattleForfeitButton onClick={() => navigate("/dashboard")} />
    </div>
  );
}
