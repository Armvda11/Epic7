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

// Récupère la liste des amis de l'utilisateur
export const fetchFriends = async (userId = 0, premier = 0, dernier = 5) => {
  try {
    const response = await API.get(`/user/friends`, {
      params: { userId, premier, dernier }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors du chargement des amis :", error);
    throw error;
  }
};

// Envoie une demande d'ami
export const sendFriendRequest = async (userId) => {
  try {
    const response = await API.get(`/user/send-friend-requests`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la demande d'ami :", error);
    throw error;
  }
};

// Accepte une demande d'ami
export const acceptFriendRequest = async (userId) => {
  try {
    const response = await API.get(`/user/accept-friend`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'acceptation de la demande d'ami :", error);
    throw error;
  }
};

// Refuse une demande d'ami
export const declineFriendRequest = async (userId) => {
  try {
    const response = await API.get(`/user/decline-friend`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors du refus de la demande d'ami :", error);
    throw error;
  }
};

// Supprime un ami
export const removeFriend = async (userId) => {
  try {
    const response = await API.get(`/user/remove-friend`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la suppression de l'ami :", error);
    throw error;
  }
};
