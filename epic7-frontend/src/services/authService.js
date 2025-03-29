// src/services/authService.js
import axios from "axios";

// Base API URL from environment
const API_URL = import.meta.env.VITE_API_URL;

// Keys for localStorage
const TOKEN_KEY = "token";

/**
 * Authenticates a user and stores the token.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} response data
 */
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token, ...rest } = response.data;

    if (!token) throw new Error("Token manquant");
    localStorage.setItem(TOKEN_KEY, token);

    return { token, ...rest };
  } catch (error) {
    throw new Error(error.response?.data?.message || "Erreur de connexion");
  }
};

/**
 * Registers a new user account.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} response data
 */
export const register = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Erreur d'inscription");
  }
};

/**
 * Logs out the user by removing the token.
 */
export const logout = () => localStorage.removeItem(TOKEN_KEY);


/**
 * Gets the auth token from localStorage.
 * @returns {string|null}
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Returns the headers for authenticated API requests.
 * @returns {object}
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
