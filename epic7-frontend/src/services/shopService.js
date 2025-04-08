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
    const response = await API.post(`/shop/buy/${itemId}`); // Pas besoin d'envoyer le token si l'utilisateur est déjà authentifié côté serveur
    return response.data; // Retourne la réponse du backend (message de succès ou erreur)
  } catch (error) {
    console.error("Erreur lors de l'achat :", error);
    throw error;
  }
};