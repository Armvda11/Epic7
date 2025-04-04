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
    const response = await API.post('/user/send-friend-request', null, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      console.error("Friend request error:", errorData);
      
      // Pass the error details to the caller
      throw {
        code: errorData.errorCode,
        message: errorData.errorMessage,
        ...error
      };
    }
    console.error("Erreur lors de l'envoi de la demande d'ami:", error);
    throw error;
  }
};

// Recherche des utilisateurs
export const searchUsers = async (searchTerm) => {
  try {
    const response = await API.get('/user/search', {
      params: { query: searchTerm }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche d'utilisateurs:", error);
    return [];
  }
};

// Récupère le profil d'un utilisateur spécifique par ID
export const fetchUserProfileById = async (userId) => {
  try {
    console.log(`Tentative de récupération du profil pour l'utilisateur ${userId}`);
    const response = await API.get(`/user/profile/${userId}`);
    console.log("Réponse API profil utilisateur:", response.data);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors du chargement du profil de l'utilisateur ${userId}:`, error);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      console.error("Request was made but no response:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    throw error;
  }
};

// Accepte une demande d'ami
export const acceptFriendRequest = async (friendId, options = {}) => {
  try {
    const response = await API.post('/user/accept-friend', null, {
      params: { userId: friendId }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        code: error.response.data.errorCode,
        message: error.response.data.errorMessage,
        ...error
      };
    }
    throw error;
  }
};

// Refuse une demande d'ami
export const declineFriendRequest = async (friendId, options = {}) => {
  try {
    const response = await API.post('/user/decline-friend', null, {
      params: { userId: friendId }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        code: error.response.data.errorCode,
        message: error.response.data.errorMessage,
        ...error
      };
    }
    throw error;
  }
};

// Supprime un ami
export const removeFriend = async (friendId) => {
  try {
    const response = await API.delete('/user/remove-friend', {
      params: { userId: friendId }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        code: error.response.data.errorCode,
        message: error.response.data.errorMessage,
        ...error
      };
    }
    throw error;
  }
};
