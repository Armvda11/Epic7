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

// utilitaire de log
function logBattleAction(message, data) {
  console.log(`%c[BATTLE] ${message}`, 'color: #42b883; font-weight: bold;', data);
}

export default function Battle() {
  // 🗂 Sélection des héros
  const [selectionPhase,    setSelectionPhase]     = useState(true);
  const [availableHeroes,   setAvailableHeroes]   = useState([]);
  const [selectedHeroes,    setSelectedHeroes]    = useState([null, null, null, null]);

  // 🛡️ État du combat
  const [battleState,       setBattleState]       = useState(null);
  const [currentHeroSkills, setCurrentHeroSkills] = useState([]);
  const [selectedSkillId,   setSelectedSkillId]   = useState(null);
  const [selectedSkillType, setSelectedSkillType] = useState(null);
  const [cooldowns,         setCooldowns]         = useState({});
  const [floatingDamages,   setFloatingDamages]   = useState([]);
  const [bossAttacking,     setBossAttacking]     = useState(false);
  const [reward,            setReward]            = useState(null);

  const navigate   = useNavigate();
  const targetRefs = useRef({});

  // ─── Chargements initiaux ──────────────────────────────────────────────
  useEffect(() => {
    API.get('/player-hero/my')
      .then(res => setAvailableHeroes(res.data))
      .catch(err => console.error("Erreur fetchAvailableHeroes:", err));
  }, []);

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

      // on envoie l'action au back
      const { data: result } = await API.post('/combat/action/skill', {
        playerHeroId: actor.id,
        skillId:      selectedSkillId,
        targetId,
      });

      // on met à jour tout
      setBattleState(result.battleState);
      setCooldowns(result.battleState.cooldowns);

      // dégâts flottants
      setFloatingDamages(f => [
        ...f,
        { id: Date.now(), x:0, y:0, value: result.damageDealt, type: result.type }
      ]);

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
    return <div className="text-center text-white animate-pulse mt-12">Chargement du combat...</div>;
  }

  const current      = battleState.participants[battleState.currentTurnIndex];
  const isPlayerTurn = current.player;
  const nextIdx      = getNextTurnIndex();
  const players      = battleState.participants.filter(p => p.player && p.currentHp > 0);
  const enemies      = battleState.participants.filter(p => !p.player && p.currentHp > 0);

  return (
    <div className="relative h-screen w-screen bg-[url('/arena.webp')] bg-cover text-white overflow-hidden">
      <HeroPortraitOverlay hero={current} />

      {bossAttacking && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <div className="bg-red-500/30 p-4 rounded-lg text-2xl font-bold animate-pulse">
            {current.name} se prépare à attaquer...
          </div>
        </div>
      )}

      {/* ordre de tour */}
      <div className="absolute top-20 left-0 pl-4 z-40">
        <TurnOrderBar participants={players} currentId={current.id} nextId={battleState.participants[nextIdx]?.id}/>
      </div>
      <div className="absolute top-20 right-0 pr-4 z-40">
        <TurnOrderBar participants={enemies} currentId={current.id} nextId={battleState.participants[nextIdx]?.id}/>
      </div>

      {/* zone avatars */}
      <div className="absolute inset-0 flex items-center justify-between px-20">
        {/* alliés */}
        <div className="flex flex-col gap-12 items-start">
          {[players.slice(0,2), players.slice(2)].map((row,i) => (
            <div key={i} className="flex gap-8">
              {row.map(h => (
                <div key={h.id} ref={el => targetRefs.current[h.id] = el} className="battle-target">
                  <BattleHeroCard
                    hero={h}
                    isCurrent={h.id === current.id}
                    isNext={h.id === battleState.participants[nextIdx]?.id}
                    highlight={getHighlightClass(h)}
                    onClick={() => selectedSkillId && selectedSkillType==='HEAL' && useSkill(h.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* ennemis */}
        <div className="flex flex-col gap-12 items-end">
          {[enemies.slice(0,2), enemies.slice(2)].map((row,i) => (
            <div key={i} className="flex gap-8">
              {row.map(b => (
                <div key={b.id} ref={el => targetRefs.current[b.id] = el} className="battle-target">
                  <BattleHeroCard
                    hero={b}
                    isCurrent={b.id === current.id}
                    highlight={getHighlightClass(b)}
                    onClick={() => selectedSkillId && selectedSkillType==='DAMAGE' && useSkill(b.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* skill bar */}
      {isPlayerTurn && currentHeroSkills.length > 0 && (
        <div id="skill-bar" className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <BattleSkillBar
            currentHero={current}
            currentHeroSkills={currentHeroSkills}
            cooldowns={cooldowns}
            selectedSkillId={selectedSkillId}
            onSkillClick={handleSkillClick}
          />
        </div>
      )}

      {/* dégâts flottants */}
      {floatingDamages.map(fd => <FloatingDamage key={fd.id} {...fd} />)}

      {/* fin */}
      {battleState.finished && (
        <BattleEndOverlay
          status={battleState.logs.some(l => l.includes('Victoire')) ? 'VICTOIRE' : 'DÉFAITE'}
          reward={reward}
          onReturn={() => navigate('/dashboard')}
        />
      )}

      {/* abandon */}
      {isPlayerTurn && !battleState.finished && (
        <div className="absolute bottom-4 right-4 z-50">
          <BattleForfeitButton onClick={() => setSelectionPhase(true)} />
        </div>
      )}
    </div>
  );
}
