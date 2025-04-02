import { useEffect, useState } from "react";
import {
  startCombat,
  performTurn,
  performAITurn,
  getCombatStatus,
} from "../services/combatService";
import { getMyHeroes } from "../services/heroService";

export default function Combat() {
  const [combat, setCombat] = useState(null);
  const [order, setOrder] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [logMessages, setLogMessages] = useState([]);
  const [error, setError] = useState(null);
  const HWAYOUNG_ID = 1;

  useEffect(() => {
    const init = async () => {
      try {
        const heroes = await getMyHeroes();
        const selected = heroes
          .sort((a, b) => b.level - a.level)
          .slice(0, 4)
          .map((h) => h.id);

        await startCombat(selected, HWAYOUNG_ID);
        const state = await getCombatStatus();

        const sortedIndexes = state.participants
          .map((p, i) => ({ index: i, speed: p.totalSpeed }))
          .sort((a, b) => b.speed - a.speed)
          .map((p) => p.index);

        setCombat(state);
        setOrder(sortedIndexes);
        setTurnIndex(0);
        setLogMessages([]);
      } catch (err) {
        setError("Erreur lors du lancement du combat");
      }
    };
    init();
  }, []);

  const nextTurn = async () => {
    if (!combat) return;
    const idx = order[turnIndex % order.length];
    const actor = combat.participants[idx];

    if (!actor || actor.currentHp <= 0) {
      setTurnIndex((prev) => prev + 1);
      return;
    }

    // Fin du combat ?
    const alivePlayers = combat.participants.filter(
      (p) => p.side === "PLAYER" && p.currentHp > 0
    );
    const aliveBoss = combat.participants.filter(
      (p) => p.side === "BOSS" && p.currentHp > 0
    );
    if (!alivePlayers.length || !aliveBoss.length) return;

    try {
      let newState;
      if (actor.side === "PLAYER") {
        const activeSkills = actor.skills.filter(
          (s) => s.category === "ACTIVE"
        );
        const skill = activeSkills[0];
        const targets = combat.participants
          .map((p, i) => ({ ...p, index: i }))
          .filter((p) => p.side === "BOSS" && p.currentHp > 0);

        const targetIndex = targets[0]?.index;
        newState = await performTurn(idx, skill.id, [targetIndex]);
      } else {
        newState = await performAITurn();
      }

      setCombat(newState);
      setLogMessages((prev) => [...prev, ...newState.logs]);
      setTurnIndex((prev) => prev + 1);
    } catch (e) {
      console.error("Tour échoué", e);
      setError("Erreur pendant un tour");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      nextTurn();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [turnIndex, combat]);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!combat) return <div className="text-white">Chargement du combat...</div>;

  return (
    <div className="text-white p-6">
      <h1 className="text-2xl font-bold mb-4">⚔️ Combat en cours</h1>

      <div className="grid grid-cols-2 gap-4">
        {combat.participants.map((p, i) => (
          <div key={i} className={`p-3 rounded-lg ${p.side === "PLAYER" ? "bg-gray-800" : "bg-red-900"}`}>
            <p><strong>{p.name}</strong></p>
            <p>❤️ {p.currentHp} / {p.maxHp}</p>
            <p>⚔️ {p.totalAttack} — 🛡️ {p.totalDefense} — ⚡ {p.totalSpeed}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">📜 Journal du combat :</h2>
        <ul className="mt-2 space-y-1">
          {logMessages.map((log, i) => (
            <li key={i} className="bg-black bg-opacity-20 p-2 rounded">
              {log.actorName} utilise {log.actionName} sur {log.targetName} : {log.heal ? "+" : "-"}{log.damage} {log.heal ? "PV soignés" : "dégâts"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
