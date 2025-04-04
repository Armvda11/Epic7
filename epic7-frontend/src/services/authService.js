import API from "../api/axiosInstance";

// Clé de stockage du token
const TOKEN_KEY = "token";

/**
 * Authentifie l'utilisateur et stocke le token.
 */
export const login = async (email, password) => {
  try {
    const response = await API.post("/auth/login", { email, password });
    const { token, ...rest } = response.data;

    if (!token) throw new Error("Token manquant");
    localStorage.setItem(TOKEN_KEY, token);

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
 * Déconnexion : supprime le token.
 */
export const logout = () => localStorage.removeItem(TOKEN_KEY);

/**
 * Retourne le token stocké.
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Retourne les headers d'autorisation (Bearer).
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
