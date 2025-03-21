import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    const data = response.data;

    if (data.token) {
      // Stockage sécurisé du token dans localStorage
      localStorage.setItem("token", data.token);
      return data;
    } else {
      throw new Error("Token non présent dans la réponse");
    }

  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    throw error;
  }
};
