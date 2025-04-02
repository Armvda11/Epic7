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
  console.log("Fetching friends with params:", { userId, premier, dernier });
  try {
    // Ajout d'un timeout pour déboguer
    const response = await API.get(`/user/friends`, {
      params: { userId, premier, dernier },
      timeout: 10000 // 10 secondes
    });
    
    // Log complet de la réponse pour débogage
    console.log("Friends API complete response:", response);
    console.log("Friends API data:", response.data);
    
    // Vérifier que la réponse est un tableau
    if (!response.data) {
      console.error("Réponse de l'API vide");
      return [];
    }
    
    // S'assurer que nous retournons bien un tableau
    if (Array.isArray(response.data)) {
      console.log("Response is an array with", response.data.length, "items");
    
    // Simple validation and return
    if (response.data) {
        return Array.isArray(response.data) ? response.data : [];
    }
    return [];
    } else {
      console.error("Response is not an array:", typeof response.data);
      return [];
    }
  } catch (error) {
    console.error("Erreur lors du chargement des amis :", error);
    // Forward the error for better handling in the component
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request was made but no response:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    // En cas d'erreur, retourner un tableau vide
    return [];
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
    const response = await API.get('/user/accept-friend', {
      params: { userId: friendId }
    }, options);
    return response.data;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// Refuse une demande d'ami
export const declineFriendRequest = async (friendId, options = {}) => {
  try {
    const response = await API.get('/user/decline-friend', {
      params: { userId: friendId }
    }, options);
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
