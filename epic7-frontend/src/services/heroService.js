import API from "../api/axiosInstance";

// Récupère les héros de l'utilisateur connecté ou d'un autre utilisateur si userId est fourni
export const getMyHeroes = async (options = {}, userId = null) => {
  try {
    // Si userId est fourni, récupère les héros de cet utilisateur
    const endpoint = userId ? `/player-hero/user/${userId}` : "/player-hero/my";
    // console.log(`Récupération des héros avec l'endpoint: ${endpoint}`);
    
    const response = await API.get(endpoint, { ...options });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des héros :", error);
    // En cas d'erreur, retourne un tableau vide plutôt que de propager l'erreur
    return [];
  }
};

// Récupère les héros de l'utilisateur connecté ou d'un autre utilisateur si userId est fourni
export const getUserHeroes = async (userId) => {
  try {
    const response = await API.get(`/player-hero/user`, { params: { userId } });
    // console.log(`Récupération des héros pour l'utilisateur ${userId}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des héros :", error);
    // En cas d'erreur, retourne un tableau vide plutôt que de propager l'erreur
    return [];
  }
};

// Récupère les détails d'un héros spécifique
// APRÈS
export const fetchHeroSkills = async (playerHeroId) => {
  // on appelle l’endpoint PlayerHero → SkillController#getSkillsByPlayerHeroId
  const { data } = await API.get(`/skill/player-hero/${playerHeroId}/skills`);
  return data;
};
