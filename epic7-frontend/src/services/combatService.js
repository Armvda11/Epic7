import API from "../api/axiosInstance";

export const startCombat = (heroIds, bossId) => {
  return API.post(`/combat/start?bossHeroId=${bossId}`, heroIds);
};

export const getCombatStatus = () => {  
  return API.get("/combat/status").then((res) => res.data);
};

export const performTurn = (actorIndex, skillId, targetIndexes) => {
  return API.post(
    `/combat/turn?actorIndex=${actorIndex}&skillId=${skillId}`,
    targetIndexes
  ).then((res) => res.data);
};

export const performAITurn = () => {
  return API.post("/combat/ai-turn").then((res) => res.data);
};