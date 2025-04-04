import API from "../api/axiosInstance";

/**
 * Récupère l'inventaire global de l'utilisateur.
 */
export const fetchInventory = async () => {
  const response = await API.get("/equipment/inventory");
  return response.data.items;
};

/**
 * Récupère les équipements d’un héros spécifique.
 */
export const fetchHeroEquipmentView = async (heroId) => {
  const response = await API.get(`/equipment/hero/${heroId}/inventory`);
  return response.data;
};


/**
 * Équiper un équipement sur un héros
 */
export const equipItem = async (equipmentId, heroId) => {
  const response = await API.post(`/equipment/${equipmentId}/equip/${heroId}`);
  return response.data; // Retourne les données du héros mis à jour
};

/**
 * Déséquiper un équipement d'un héros
 */
export const unequipItem = async (equipmentId) => {
  const response = await API.post(`/equipment/${equipmentId}/unequip`);
  return response.data; // Retourne les données du héros mis à jour
};