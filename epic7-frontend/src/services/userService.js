import API from "../api/axiosInstance";

// Récupère le profil de l'utilisateur
export const fetchUserProfile = async () => {
  try {
    const response = await API.get("/user/me", { 
      useGlobalErrorHandler: false 
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors du chargement du profil utilisateur :", error);
    throw error;
  }
};

// Récupère la liste des amis de l'utilisateur
export const fetchFriends = async (userId = 0, premier = 0, dernier = 100) => {
  try {
    // Use standard API request - matching the pattern of other working requests
    const response = await API.get("/user/friends", {
      params: { userId, premier, dernier }
    });
    
    // Simple validation and return
    if (response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    return [];
  } catch (error) {
    console.error("Erreur lors du chargement des amis :", error);
    // Forward the error for better handling in the component
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
export const acceptFriendRequest = async (friendId, options = {}) => {
  try {
    const response = await API.post(`/friends/accept/${friendId}`, {}, options);
    return response.data;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// Refuse une demande d'ami
export const declineFriendRequest = async (friendId, options = {}) => {
  try {
    const response = await API.post(`/friends/decline/${friendId}`, {}, options);
    return response.data;
  } catch (error) {
    console.error("Error declining friend request:", error);
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
