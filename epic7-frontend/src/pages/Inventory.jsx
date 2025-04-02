import React, { useEffect, useState } from "react";
import EquipmentCard from "../components/equipment/EquipmentCard";
import EquipmentDetails from "../components/equipment/EquipmentDetails";
import { useSettings } from "../context/SettingsContext";
import { fetchInventory } from "../services/equipmentService";
import { useNavigate } from "react-router-dom";

// Cette page affiche l'inventaire de l'utilisateur
// Elle utilise le service d'équipement pour récupérer les données de l'inventaire
// et les composants EquipmentCard et EquipmentDetails pour afficher les informations
const Inventory = () => {
  const [equipments, setEquipments] = useState([]); // État pour stocker les équipements
  const [selected, setSelected] = useState(null); // État pour stocker l'équipement sélectionné
  const { language, t } = useSettings(); // Récupération de la langue et des traductions
  const navigate = useNavigate();

  // Fonction pour charger l'inventaire de l'utilisateur
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const items = await fetchInventory();
        setEquipments(items);
      } catch (error) {
        console.error("Erreur lors du chargement de l'inventaire", error);
      }
    };
    loadInventory();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("inventory", language)}</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {t("back", language)}
        </button>
      </div>
   
      <section className="flex flex-col lg:flex-row gap-6">
        {/* Liste des équipements */}
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex gap-4">
            {equipments.map((eq) => (
              <EquipmentCard
                key={eq.id}
                equipment={eq}
                onClick={() => setSelected(eq)}
              />
            ))}
          </div>
        </div>

        {/* Détails sélectionnés */}
        <aside className="w-full lg:w-96 bg-[#2e2b4a] rounded-xl p-4 shadow-md min-h-[200px]">
          {selected ? (
            <EquipmentDetails equipment={selected} />
          ) : (
            <p className="text-center text-gray-400">
              {t("selectEquipment", language)}
            </p>
          )}
        </aside>
      </section>
    </main>
  );
};

export default Inventory;
