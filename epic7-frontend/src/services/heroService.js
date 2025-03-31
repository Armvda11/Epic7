import API from "../api/axiosInstance";

// Récupère les héros de l'utilisateur connecté
export const getMyHeroes = async () => {
  try {
    const response = await API.get("/player-hero/my");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des héros :", error);
    throw error;
  }
};

// Récupère les détails d'un héros spécifique
export const fetchHeroSkills = async (heroId) => {
  const response = await API.get(`/skill/hero/${heroId}`);
  return response.data;
};
