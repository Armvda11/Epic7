import React, { useEffect, useState } from "react";
import EquipmentCard from "../components/equipment/EquipmentCard";
import EquipmentDetails from "../components/equipment/EquipmentDetails";
import { useSettings } from "../context/SettingsContext";
import { fetchInventory } from "../services/equipmentService";

const Inventory = () => {
  const [equipments, setEquipments] = useState([]);
  const [selected, setSelected] = useState(null);
  const { language, t } = useSettings();

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
      
      <h1 className="text-3xl font-bold mb-6">{t("inventory", language)}</h1>
   
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
