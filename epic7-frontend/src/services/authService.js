import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });

  const data = response.data;

  if (data.token) {
    localStorage.setItem("token", data.token);
    return data;
  } else {
    throw new Error("Token manquant");
  }
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
