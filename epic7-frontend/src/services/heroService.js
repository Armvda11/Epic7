import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/player-hero';

export const getMyHeroes = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/my`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des héros :", error);
    throw error;
  }
};
