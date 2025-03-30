import API from "../api/axiosInstance";

// Récupère le profil de l'utilisateur
export const fetchUserProfile = async () => {
  try {
    const response = await API.get("/user/me");
    return response.data;
  } catch (error) {
    console.error("Erreur lors du chargement du profil utilisateur :", error);
    throw error;
  }
};
