import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { equipItem, unequipItem, fetchHeroEquipmentView } from "../services/equipmentService";

import EquipmentSlot from "../components/equipment/EquipmentSlot";
import EquipmentDetailsPanel from "../components/equipment/EquipmentDetailsPanel";
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
const HeroView = () => {
  const { heroId } = useParams();
  const [heroName, setHeroName] = useState("");
  const [equipped, setEquipped] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const { language, t } = useSettings();
  const navigate = useNavigate();

  const loadHeroInventory = async () => {
    try {
      const data = await fetchHeroEquipmentView(heroId);
      setHeroName(data.heroName);
      setEquipped(data.equippedItems || []);
      setAvailable(data.availableItems || []);
    } catch (error) {
      console.error("Erreur lors du chargement :", error);
    }
  };

  // ✅ Ces fonctions doivent être en-dehors du useEffect
  const handleEquip = async (equipmentId) => {
    try {
      await equipItem(equipmentId, heroId);
      await loadHeroInventory();
      setSelectedEquipment(null);
    } catch (error) {
      console.error("Erreur lors de l’équipement :", error);
    }
  };

  const handleUnequip = async (equipmentId) => {
    try {
      await unequipItem(equipmentId);
      await loadHeroInventory();
      setSelectedEquipment(null);
    } catch (error) {
      console.error("Erreur lors du déséquipement :", error);
    }
  };

  useEffect(() => {
    loadHeroInventory();
  }, [heroId, language]);


  const getEquippedByType = (type) => {
    return equipped.find((item) => item.type.toUpperCase() === type.toUpperCase());
  };
  const handleSlotClick = (slotType) => {
    setSelectedSlot(slotType);
    const equippedItem = getEquippedByType(slotType);
    setSelectedEquipment(equippedItem || null);
  };
  
  

  const filteredAvailable = selectedSlot
    ? available.filter((item) => item.type === selectedSlot)
    : [];


    

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">{heroName}</h1>

      <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Centre : Slots + Sprite */}
        <div className="relative w-80 h-96 flex items-center justify-center">
          <img
            src={`/epic7-Hero/sprite-hero/${heroName.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`}
            alt={heroName}
            className="w-60 h-auto drop-shadow-xl"
          />

          {/* Slots */}
          <div className="absolute top-4 left-4">
            <EquipmentSlot
              type="WEAPON"
              equipment={getEquippedByType("WEAPON")}
              onClick={() => handleSlotClick("WEAPON")}

            />
          </div>

          <div className="absolute bottom-4 left-4">
            <EquipmentSlot
              type="ARMOR"
              equipment={getEquippedByType("ARMOR")}
              onClick={() => handleSlotClick("ARMOR")}
            />
          </div>

          <div className="absolute top-4 right-4">
            <EquipmentSlot
              type="NECKLACE"
              equipment={getEquippedByType("NECKLACE")}
              onClick={() => handleSlotClick("NECKLACE")}
            />
          </div>

          <div className="absolute bottom-4 right-4">
            <EquipmentSlot
              type="BOOTS"
              equipment={getEquippedByType("BOOTS")}
              onClick={() => handleSlotClick("BOOTS")}
            />
          </div>
        </div>

        {/* Détails ou équipements disponibles */}
        <aside className="w-full lg:w-96 bg-[#2e2b4a] rounded-xl p-4 shadow-md max-h-[80vh] overflow-y-auto">
          {selectedEquipment ? (
           <EquipmentDetailsPanel
           equipment={selectedEquipment}
           currentHeroId={parseInt(heroId)}
           onEquip={handleEquip}
           onUnequip={handleUnequip}
         />
         
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">
                {selectedSlot
                  ? `Équipements disponibles (${selectedSlot})`
                  : "Sélectionne un emplacement"}
              </h2>

              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((eq) => (
                  <div
                    key={eq.id}
                    onClick={() => setSelectedEquipment(eq)}
                    className="cursor-pointer mb-3"
                  >
                    <div className="bg-gray-700 hover:bg-gray-600 p-3 rounded transition">
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-sm text-gray-300">{eq.rarity} • Lv.{eq.level}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400">
                  Aucun équipement disponible
                </p>
              )}
            </>
          )}
        </aside>
      </section>
      <button
            onClick={() => navigate('/my-heroes')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {t("back", language)}
          </button>
      
    </main>
  );
};

export default HeroView;
