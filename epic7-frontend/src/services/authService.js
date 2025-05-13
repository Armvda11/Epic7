import API from "../api/axiosInstance";

// Clés de stockage
const TOKEN_KEY = "token";
const USER_EMAIL_KEY = "userEmail"; // Ajout d'une clé pour l'email utilisateur

/**
 * Authentifie l'utilisateur et stocke le token.
 */
export const login = async (email, password) => {
  try {
    const response = await API.post("/auth/login", { email, password });
    const { token, ...rest } = response.data;

    if (!token) throw new Error("Token manquant");
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_EMAIL_KEY, email); // Stocker l'email de l'utilisateur

    return { token, ...rest };
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
 * Déconnexion : supprime le token et l'email.
 */
export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY); // Supprimer aussi l'email lors de la déconnexion
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
 * Retourne les headers d'autorisation (Bearer).
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
