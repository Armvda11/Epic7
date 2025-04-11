import API from "../api/axiosInstance";

export const performSummon = async (bannerId) => {
  try {
    const response = await API.post(`/summons/random`, { bannerId });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'invocation :", error);
    throw error;
  }
};

export const getBannerHeroes = async (bannerId) => {
  try {
    const response = await API.get(`/summons/${bannerId}/heroes`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des héros de la bannière :", error);
    throw error;
  }
};

export const getOwnedHeroes = async () => {
  try {
    const response = await API.get("/summons/owned-heroes");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des héros possédés :", error);
    throw error;
  }
};