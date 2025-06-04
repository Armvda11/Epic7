import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import EquipmentCard from "../components/equipment/EquipmentCard";
import EquipmentDetails from "../components/equipment/EquipmentDetails";
import { useSettings } from "../context/SettingsContext";
import { useMusic } from "../context/MusicContext";
import { fetchInventory } from "../services/equipmentService";
import { useNavigate } from "react-router-dom";
import { ModernPageLayout, ModernCard, ModernButton, MusicController } from "../components/ui";
import { FaArrowLeft, FaBox } from "react-icons/fa";

// Cette page affiche l'inventaire de l'utilisateur
// Elle utilise le service d'équipement pour récupérer les données de l'inventaire
// et les composants EquipmentCard et EquipmentDetails pour afficher les informations
const Inventory = () => {
  const [equipments, setEquipments] = useState([]); // État pour stocker les équipements
  const [selected, setSelected] = useState(null); // État pour stocker l'équipement sélectionné
  const { language, t } = useSettings(); // Récupération de la langue et des traductions
  const navigate = useNavigate();
  const { preloadMusic, playDashboardMusic } = useMusic(); // Hook de musique

  // Fonction pour charger l'inventaire de l'utilisateur
  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    const loadInventory = async () => {
      try {
        const items = await fetchInventory();
        setEquipments(items);
      } catch (error) {
        console.error("Erreur lors du chargement de l'inventaire", error);
      }
    };
    loadInventory();
  }, [preloadMusic, playDashboardMusic]);

  return (
    <ModernPageLayout>
      {/* Header */}
      <motion.header 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ModernButton 
          variant="ghost"
          onClick={() => navigate("/dashboard")} 
          className="mb-4 flex items-center gap-2"
        >
          <FaArrowLeft /> {t("back", language)}
        </ModernButton>
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {t("inventory", language)}
        </h1>
      </motion.header>
      <div className="max-w-7xl mx-auto">
        <motion.section 
          className="flex flex-col lg:flex-row gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Liste des équipements */}
          <div className="flex-1">
            <ModernCard className="p-6">
              <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t("equipment", language) || "Equipment"}
              </h2>
              {equipments.length > 0 ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4 min-w-max">
                    {equipments.map((eq, index) => (
                      <motion.div
                        key={eq.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <EquipmentCard
                          equipment={eq}
                          onClick={() => setSelected(eq)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                    <FaBox className="text-gray-400 dark:text-gray-500" size={24} />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t("emptyInventory", language) || "Your inventory is empty"}
                  </p>
                </div>
              )}
            </ModernCard>
          </div>

          {/* Détails de l'équipement sélectionné */}
          {selected && (
            <motion.div 
              className="lg:w-96"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ModernCard className="p-6">
                <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t("equipmentDetails", language) || "Equipment Details"}
                </h2>
                <EquipmentDetails equipment={selected} />
              </ModernCard>
            </motion.div>
          )}
        </motion.section>
      </div>
      
      {/* Contrôleur de musique */}
      <MusicController />
    </ModernPageLayout>
  );
};

export default Inventory;
