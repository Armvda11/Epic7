import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { equipItem, unequipItem, fetchHeroEquipmentView } from "../services/equipmentService";
import EquipmentSlot from "../components/equipment/EquipmentSlot";
import EquipmentDetailsPanel from "../components/equipment/EquipmentDetailsPanel";
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { heroImg } from "../components/heroUtils";

// Cette page affiche les détails d'un héros spécifique, y compris son équipement
// et permet à l'utilisateur d'équiper ou de déséquiper des objets.
// Elle utilise le service d'équipement pour récupérer les données de l'équipement du héros
// et les fonctions d'équipement/déséquipement.
// il se sert des composants EquipmentSlot et EquipmentDetailsPanel pour afficher les informations
// de manière claire et interactive.
const HeroView = () => {
  const { heroId } = useParams(); // Récupération de l'ID du héros depuis l'URL
  const [heroName, setHeroName] = useState(""); // Nom du héros
  const [equipped, setEquipped] = useState([]); // Équipements actuellement équipés
  const [available, setAvailable] = useState([]); // Équipements disponibles
  const [selectedSlot, setSelectedSlot] = useState(null); // Emplacement sélectionné pour l'équipement
  const [selectedEquipment, setSelectedEquipment] = useState(null); // Équipement sélectionné pour afficher les détails
  const { language, t } = useSettings(); // Récupération de la langue et des traductions
  const navigate = useNavigate(); // Navigation vers d'autres pages

  // Fonction pour charger l'inventaire du héros
  const loadHeroInventory = async () => {
    try {
      const data = await fetchHeroEquipmentView(heroId); // Récupération des données de l'équipement du héros
      setHeroName(data.heroName); // Mise à jour du nom du héros
      setEquipped(data.equippedItems || []); // Mise à jour des équipements équipés
      setAvailable(data.availableItems || []); // Mise à jour des équipements disponibles
    } catch (error) {
      console.error("Erreur lors du chargement :", error);
    }
  };

  // Fonction pour équiper un objet
  // Elle utilise le service d'équipement pour effectuer l'action
  const handleEquip = async (equipmentId) => {
    try {
      await equipItem(equipmentId, heroId);
      await loadHeroInventory();
      setSelectedEquipment(null);
    } catch (error) {
      console.error("Erreur lors de l’équipement :", error);
    }
  };

  // Fonction pour déséquiper un objet
  // Elle utilise le service d'équipement pour effectuer l'action
  const handleUnequip = async (equipmentId) => {
    try {
      await unequipItem(equipmentId);
      await loadHeroInventory();
      setSelectedEquipment(null);
    } catch (error) {
      console.error("Erreur lors du déséquipement :", error);
    }
  };

  // Chargement de l'inventaire du héros au premier rendu et à chaque changement d'ID de héros ou de langue
  useEffect(() => {
    loadHeroInventory();
  }, [heroId, language]);


  // Fonction pour récupérer l'équipement équipé 
  const getEquippedByType = (type) => {
    return equipped.find((item) => item.type.toUpperCase() === type.toUpperCase());
  };

  // Fonction pour gérer le clic sur un emplacement d'équipement
  const handleSlotClick = (slotType) => {
    setSelectedSlot(slotType);
    const equippedItem = getEquippedByType(slotType);
    setSelectedEquipment(equippedItem || null);
  };

  // Filtrage des équipements disponibles en fonction de l'emplacement sélectionné
  // Si un emplacement est sélectionné, on filtre les équipements disponibles
  const filteredAvailable = selectedSlot  ? available.filter((item) => item.type === selectedSlot)  : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold mb-6 text-center">{heroName}</h1>

      <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Centre : Slots + Sprite */}
        <div className="relative w-80 h-96 flex items-center justify-center">
          <img  src={heroImg(heroName)}  alt={heroName}  className="w-60 h-auto drop-shadow-xl"/>

          {/* Slots */}
          <div className="absolute top-4 left-4">
            <EquipmentSlot  type="WEAPON"  equipment={getEquippedByType("WEAPON")}  onClick={() => handleSlotClick("WEAPON")}/>
          </div>

          <div className="absolute bottom-4 left-4">
            <EquipmentSlot  type="ARMOR"  equipment={getEquippedByType("ARMOR")}  onClick={() => handleSlotClick("ARMOR")}/>
          </div>

          <div className="absolute top-4 right-4">
            <EquipmentSlot  type="NECKLACE"  equipment={getEquippedByType("NECKLACE")}  onClick={() => handleSlotClick("NECKLACE")}/>
          </div>

          <div className="absolute bottom-4 right-4">
            <EquipmentSlot  type="BOOTS"  equipment={getEquippedByType("BOOTS")}  onClick={() => handleSlotClick("BOOTS")}/>
          </div>
        </div>

        {/* Détails ou équipements disponibles */}
        <aside className="w-full lg:w-96 bg-white dark:bg-[#2e2b4a] rounded-xl p-4 shadow-md max-h-[80vh] overflow-y-auto">
          {selectedEquipment ? (
            <EquipmentDetailsPanel  equipment={selectedEquipment}  currentHeroId={parseInt(heroId)}  onEquip={handleEquip}  onUnequip={handleUnequip}/>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center">
                {selectedSlot  
                  ? `${t("availableEquipment", language)} (${t(selectedSlot.toLowerCase(), language)})`  
                  : t("selectSlot", language)}
              </h2>

              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((eq) => (
                  <div  key={eq.id}  onClick={() => setSelectedEquipment(eq)}  className="cursor-pointer mb-3">
                    <div className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-3 rounded transition">
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{t(eq.rarity.toLowerCase(), language)} • Lv.{eq.level}</p>
                    </div>
                  </div>
                  )) ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">{t("noEquipmentAvailable", language)}</p>
              )}
            </>
          )}
        </aside>
      </section>
      <button onClick={() => navigate('/my-heroes')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded mt-6 self-start">
        {t("back", language)}
      </button>
    </main>
  );
};

export default HeroView;
