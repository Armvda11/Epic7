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


export const buyItem = async (itemId) => {
  try {
    const response = await API.post(`/shop/buy/${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'achat :", error);
    
    // Gestion spécifique des erreurs
    if (error.response?.status === 400) {
      throw new Error(error.response.data || "Achat impossible");
    } else if (error.response?.status === 401) {
      throw new Error("Vous devez être connecté pour effectuer un achat");
    } else if (error.response?.status === 403) {
      throw new Error("Vous n'avez pas l'autorisation d'effectuer cet achat");
    } else {
      throw new Error("Erreur serveur lors de l'achat");
    }
  }
};