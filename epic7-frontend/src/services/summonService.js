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

export const getBannerEquipments = async (bannerId) => {
  try {
    const response = await API.get(`/summons/${bannerId}/equipments`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements de la bannière :", error);
    throw error;
  }
};

export async function getOwnedHeroes() {
  try {
    const response = await API.get("/player-hero/my");
    // Assurez-vous de renvoyer un tableau
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Erreur lors de la récupération des héros possédés :", error);
    return []; // Toujours renvoyer un tableau, même en cas d'erreur
  }
}