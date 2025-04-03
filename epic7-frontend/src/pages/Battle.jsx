// ✅ Battle.jsx (version complète avec sélection de cible par clic sur l'image du héros)

import React, { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import { motion } from 'framer-motion';

export default function Battle() {
  const [battleState, setBattleState] = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null); // 'DAMAGE' ou 'HEAL'

  useEffect(() => {
    startCombat();
  }, []);

  const startCombat = async () => {
    try {
      await axios.post('/combat/start', { bossHeroId: 1 });
      fetchBattleState();
    } catch (error) {
      console.error('❌ Erreur au démarrage du combat :', error);
    }
  };

  const fetchBattleState = async () => {
    const res = await axios.get('/combat/state');
    setBattleState(res.data);
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
      targetId
    });
    fetchBattleState();
  };

  const currentHero = battleState?.participants?.[battleState?.currentTurnIndex];
  const isPlayerTurn = currentHero?.player;
  const getHeroImage = (name) => `/epic7-Hero/webp/${name.toLowerCase().replace(/ /g, '-')}.webp`;

  const renderHealthBar = (current, max) => {
    const percent = (current / max) * 100;
    return (
      <div className="w-full bg-gray-700 rounded h-2 mt-2">
        <div className="h-2 rounded" style={{ width: `${percent}%`, backgroundColor: percent > 50 ? '#4ade80' : '#f87171' }} />
      </div>
    );
  };

  const navigateToDashboard = () => window.location.href = "/dashboard";

  const getEndStatus = () => {
    if (!battleState?.finished) return null;
    return battleState.logs.some(log => log.includes("Victoire")) ? "VICTOIRE" : "DÉFAITE";
  };

  const handleSkillClick = (skill) => {
    if (skill.category === 'PASSIVE') return;
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

  if (loading || !battleState) return <div>Chargement du combat...</div>;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-black text-white relative">
      {/* 👥 Alliés */}
      <div className="w-1/4 p-4 space-y-4">
        {battleState.participants.filter(p => p.player).map(hero => (
          <div
            key={hero.id}
            className={`p-3 rounded-xl border-2 ${hero.id === currentHero.id ? 'border-red-500' : 'border-gray-700'} ${getHighlightClass(hero)} bg-gray-800 relative`}
            onClick={() => selectedSkillId && selectedSkillType === 'HEAL' && useSkill(hero.id)}
          >
            <img src={getHeroImage(hero.name)} alt={hero.name} className="w-full h-24 object-contain" />
            <div className="text-center mt-1 font-bold text-sm">{hero.name}</div>
            {renderHealthBar(hero.currentHp, hero.maxHp)}
            <div className="text-xs text-center">{hero.currentHp} / {hero.maxHp}</div>
          </div>
        ))}
      </div>

      {/* 📝 Journal */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-3">Journal de combat</h2>
        <ul className="space-y-1 text-sm">
          {battleState.logs.map((log, idx) => (
            <li key={idx} className="text-gray-300">{log}</li>
          ))}
        </ul>
      </div>

      {/* 👹 Ennemis */}
      <div className="w-1/4 p-4 space-y-4">
        {battleState.participants.filter(p => !p.player).map(boss => (
          <div
            key={boss.id}
            className={`p-3 rounded-xl border border-gray-700 text-center ${getHighlightClass(boss)} bg-gray-900`}
            onClick={() => selectedSkillId && selectedSkillType === 'DAMAGE' && useSkill(boss.id)}
          >
            <img src={getHeroImage(boss.name)} alt={boss.name} className="w-full h-28 object-contain" />
            <div className="font-bold mt-1">{boss.name}</div>
            {renderHealthBar(boss.currentHp, boss.maxHp)}
            <div className="text-xs">{boss.currentHp} / {boss.maxHp}</div>
          </div>
        ))}
      </div>

      {/* 🧠 Compétences */}
      {isPlayerTurn && (
        <div className="absolute bottom-4 left-1/4 right-4 flex justify-center gap-6 z-40">
          {currentHeroSkills.map(skill => {
            const folder = currentHero.name.toLowerCase().replace(/ /g, '-');
            const skillImg = `/icons/${folder}_skill/${folder}_skill_${skill.position + 1}.webp`;
            const isPassive = skill.category === 'PASSIVE';

            return (
              <motion.div key={skill.id} whileHover={{ scale: 1.05 }} className="relative group">
                <button
                  disabled={isPassive}
                  onClick={() => handleSkillClick(skill)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shadow-lg flex items-center justify-center
                    ${isPassive ? 'bg-gray-700 opacity-50' : 'bg-gradient-to-br from-purple-700 to-indigo-800 ring-2 ring-purple-500'}
                    ${selectedSkillId === skill.id ? 'ring-4 ring-yellow-400' : ''}`}
                >
                  <img src={skillImg} alt={skill.name} className="w-12 h-12 object-contain" />
                </button>
                <p className="text-xs text-center text-gray-200 mt-1">{skill.name}</p>
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-black/90 text-white rounded-lg px-4 py-3 w-64 shadow-lg z-50 text-left backdrop-blur-sm">
                  <p className="font-semibold text-sm text-blue-300">{skill.name}</p>
                  <p className="text-xs italic text-gray-400 mb-1">{skill.category}</p>
                  <p className="text-sm text-gray-200">{skill.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 🏁 Fin du combat */}
      {battleState.finished && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className={`p-10 rounded-2xl shadow-xl text-center w-96 border-2
            ${getEndStatus() === "VICTOIRE" ? "bg-green-900/30 border-green-400" : "bg-red-900/30 border-red-400"}`}>
            <h2 className={`text-4xl font-extrabold mb-4 ${getEndStatus() === "VICTOIRE" ? "text-green-400" : "text-red-400"}`}>
              {getEndStatus() === "VICTOIRE" ? "🎉 Victoire !" : "💀 Défaite"}
            </h2>
            <p className="text-gray-300 mb-6">
              {getEndStatus() === "VICTOIRE"
                ? "Le boss a été vaincu. Félicitations !"
                : "Tous vos héros sont morts. Essayez encore !"}
            </p>
            <button
              onClick={navigateToDashboard}
              className={`px-6 py-2 rounded font-semibold shadow text-white transition
                ${getEndStatus() === "VICTOIRE" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              Retour au Dashboard
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
