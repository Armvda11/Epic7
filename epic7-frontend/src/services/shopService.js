import API from "../api/axiosInstance";

// Récupère les elements a disponible dans le shop
export const getShopItems = async () => {
  try {
    const response = await API.get("/shop/items");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des éléments du shop :", error);
    throw error;
  }
};
