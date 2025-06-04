import API from "../api/axiosInstance";

// Clés de stockage
const TOKEN_KEY = "token";
const USER_EMAIL_KEY = "userEmail";
const USER_ID_KEY = "userId"; // Ajout d'une clé pour l'ID utilisateur

/**
 * Authentifie l'utilisateur et stocke le token.
 */
export const login = async (email, password) => {
  try {
    const response = await API.post("/auth/login", { email, password });
    const { token, id, message } = response.data;

    if (!token) throw new Error("Token manquant");
    
    
    console.log(`Login successful: ${message}`);
    console.log(`Received user ID: ${id} (${typeof id})`);
    
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_EMAIL_KEY, email);
    
    // Store the user ID in a single location
    if (id) {
      console.log(`Storing user ID: ${id} (${typeof id})`);
      // Ensure ID is stored as string for consistency between systems
      const idString = id.toString();
      localStorage.setItem(USER_ID_KEY, idString);
    } else {
      console.warn("Login successful but no user ID was provided by the server");
      // Attempt immediate ID retrieval via the profile API
      try {
        const profileResponse = await API.get("/user/me");
        if (profileResponse.data && profileResponse.data.id) {
          const userId = profileResponse.data.id.toString();
          localStorage.setItem(USER_ID_KEY, userId);
          console.log(`Retrieved and stored user ID: ${userId} from profile`);
        } else {
          // If still no ID, try the lookup endpoint as a last resort
          const lookupResponse = await API.get("/user/lookup", {
            params: { email }
          });
          
          if (lookupResponse.data && lookupResponse.data.id) {
            const userId = lookupResponse.data.id.toString();
            localStorage.setItem(USER_ID_KEY, userId);
            console.log(`Retrieved and stored user ID: ${userId} from lookup`);
          } else {
            console.warn("Could not retrieve user ID from any source");
          }
        }
      } catch (profileError) {
        console.error("Failed to retrieve user ID:", profileError);
      }
    }

    return { token, id, message };
  } catch (error) {
    throw new Error(error.response?.data?.message || "Erreur de connexion");
  }
};

/**
 * Enregistre un nouvel utilisateur.
 */
export const register = async (email, password) => {
  try {
    const response = await API.post("/auth/register", { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Erreur d'inscription");
  }
};

/**
 * Déconnexion : supprime le token et les informations utilisateur.
 */
export const logout = () => {
  // Clear all auth tokens
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_ID_KEY);
  
  console.log('User logged out - all identification cleared');
};

/**
 * Retourne le token stocké.
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Retourne l'email de l'utilisateur stocké.
 */
export const getUserEmail = () => localStorage.getItem(USER_EMAIL_KEY);

/**
 * Retourne l'ID de l'utilisateur stocké.
 */
export const getUserId = () => localStorage.getItem(USER_ID_KEY);

/**
 * Retourne les headers d'autorisation (Bearer).
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
