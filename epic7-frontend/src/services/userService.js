// src/services/userService.js
import axios from 'axios';
import { getToken } from './authService';

const API_BASE_URL = 'http://localhost:8080/api/user';

export async function fetchUserProfile() {
  const token = getToken();
  try {
    const response = await axios.get(`${API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil utilisateur :", error);
    throw error;
  }
}
