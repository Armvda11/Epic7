import API from '../api/axiosInstance';

export const getHeroes = async () => {
  try {
    const response = await API.get('/admin/heroes');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des héros:', error);
    throw error;
  }
};