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
    const response = await API.get("/summons/owned-heroes");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des héros possédés :", error);
    throw error;
  }
}

export async function getAllHeroes() {
  try {
    const response = await API.get("/summons/all-heroes");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de tous les héros :", error);
    throw error;
  }
}

export const getRarestHero = async (bannerId) => {
  try {
    const response = await API.get(`/summons/${bannerId}/rarest-hero`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du héros le plus rare :", error);
    throw error;
  }
}