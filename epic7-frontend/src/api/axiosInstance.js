import axios from "axios";
import { getToken, logout } from "../services/authService";

// Création d'une instance Axios
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur de requête : ajoute le token
API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur de réponse : gère l'erreur 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = "/"; // redirection vers login
    }
    return Promise.reject(error);
  }
);

export default API;
