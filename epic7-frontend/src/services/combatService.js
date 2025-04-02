import API from "../api/axiosInstance";

export const startCombat = (heroIds, bossId) =>
  API.post(`/combat/start?bossHeroId=${bossId}`, heroIds);

export const performTurn = (actorIndex, skillId, targets) =>
  API.post(`/combat/turn?actorIndex=${actorIndex}&skillId=${skillId}`, targets).then((r) => r.data);

export const performAITurn = () =>
  API.post("/combat/ai-turn").then((r) => r.data);

export const getCombatStatus = () =>
  API.get("/combat/status").then((r) => r.data);
