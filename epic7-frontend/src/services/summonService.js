import API from "../api/axiosInstance";

export const performSummon = async () => {
  try {
    const response = await API.post("/summons/random");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de l'invocation :", error);
    throw error;
  }
};