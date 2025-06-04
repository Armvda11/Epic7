import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { equipItem, unequipItem, fetchHeroEquipmentView } from "../services/equipmentService";
import EquipmentSlot from "../components/equipment/EquipmentSlot";
import EquipmentDetailsPanel from "../components/equipment/EquipmentDetailsPanel";
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import { useNavigate } from 'react-router-dom';
import { heroImg, heroImgUnknown } from "../components/heroUtils";
import { ModernPageLayout, ModernCard, ModernButton, MusicController } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaInfoCircle, FaBolt, FaHeart, FaStar } from 'react-icons/fa';
import { GiArmorUpgrade, GiSwordWound, GiShield } from 'react-icons/gi';

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
  const { language, t, theme } = useSettings(); // Récupération de la langue, des traductions et du thème
  const navigate = useNavigate(); // Navigation vers d'autres pages
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { preloadMusic, playDashboardMusic } = useMusic();

  // Fonction pour charger l'inventaire du héros
  const loadHeroInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchHeroEquipmentView(heroId); // Récupération des données de l'équipement du héros
      setHeroName(data.heroName); // Mise à jour du nom du héros
      setEquipped(data.equippedItems || []); // Mise à jour des équipements équipés
      setAvailable(data.availableItems || []); // Mise à jour des équipements disponibles
      setError(null);
    } catch (error) {
      console.error("Erreur lors du chargement :", error);
      setError(t('equipmentLoadError', language));
    } finally {
      setLoading(false);
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
      console.error("Erreur lors de l'équipement :", error);
      setError(t('equipError', language));
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
      setError(t('unequipError', language));
    }
  };

  // Chargement de l'inventaire du héros au premier rendu et initialisation de la musique
  useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    loadHeroInventory();
  }, [heroId, language, preloadMusic, playDashboardMusic]);


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

  // Fonction pour obtenir une couleur pour chaque type d'équipement
  const getTypeColor = (type) => {
    const colors = {
      WEAPON: 'from-red-400 to-pink-500',
      ARMOR: 'from-blue-400 to-indigo-500',
      NECKLACE: 'from-yellow-400 to-amber-500',
      BOOTS: 'from-green-400 to-emerald-500',
    };
    return colors[type] || 'from-purple-400 to-indigo-500';
  };

  // Filtrage des équipements disponibles en fonction de l'emplacement sélectionné
  const filteredAvailable = selectedSlot ? available.filter((item) => item.type === selectedSlot) : [];

  // Animations pour les éléments
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  if (loading) {
    return (
      <ModernPageLayout 
        title={t("heroEquipment", language) || "Équipement du héros"} 
        subtitle={t("loading", language) || "Chargement..."}
        showBackButton={true}
        backTo="/my-heroes"
      >
        <div className="flex items-center justify-center min-h-64">
          <motion.div
            className={`p-8 rounded-2xl backdrop-blur-sm ${
              theme === 'dark' 
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/80 border-white/40'
            } border`}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <GiArmorUpgrade className="w-8 h-8 text-purple-500" />
          </motion.div>
        </div>
      </ModernPageLayout>
    );
  }

  if (error) {
    return (
      <ModernPageLayout 
        title={t("heroEquipment", language) || "Équipement du héros"} 
        subtitle={t("error", language) || "Erreur"}
        showBackButton={true}
        backTo="/my-heroes"
      >
        <ModernCard className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <ModernButton 
            variant="primary" 
            onClick={() => loadHeroInventory()}
          >
            {t("retry", language) || "Réessayer"}
          </ModernButton>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout 
      title={heroName}
      subtitle={t("equipmentManagement", language) || "Gestion de l'équipement"}
      showBackButton={true}
      backTo="/my-heroes"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col lg:flex-row gap-8 items-start"
      >
        {/* Section gauche: Sprite du héros et emplacements d'équipement */}
        <motion.div 
          variants={itemVariants}
          className={`relative rounded-2xl p-6 ${
            theme === 'dark' 
              ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' 
              : 'bg-indigo-50/80 backdrop-blur-sm border border-indigo-100'
          } flex-1 flex flex-col items-center`}
        >
          {/* Sprite du héros agrandi */}
          <div className="relative mb-6">
            <img  
              src={heroImg(heroName)}  
              alt={heroName}  
              className="w-80 h-auto drop-shadow-xl rounded-lg object-cover"
              onError={e => e.target.src = heroImgUnknown}
            />
            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-sm px-2 py-1 rounded-full">
              {t("level", language)} {equipped.length > 0 ? (equipped[0]?.heroLevel || equipped[0]?.level || "1") : "1"}
            </div>
          </div>

          {/* Emplacements d'équipement dans une grille plus visible */}
          <div className="grid grid-cols-2 gap-6 w-full">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              className={`p-3 rounded-lg bg-gradient-to-r ${getTypeColor('WEAPON')} bg-opacity-10 backdrop-blur-sm`}
            >
              <h3 className="text-center font-semibold mb-2 text-white">{t("weapon", language)}</h3>
              <EquipmentSlot 
                type="WEAPON" 
                equipment={getEquippedByType("WEAPON")} 
                onClick={() => handleSlotClick("WEAPON")}
                className="mx-auto"
              />
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }} 
              className={`p-3 rounded-lg bg-gradient-to-r ${getTypeColor('ARMOR')} bg-opacity-10 backdrop-blur-sm`}
            >
              <h3 className="text-center font-semibold mb-2 text-white">{t("armor", language)}</h3>
              <EquipmentSlot 
                type="ARMOR" 
                equipment={getEquippedByType("ARMOR")} 
                onClick={() => handleSlotClick("ARMOR")}
                className="mx-auto"
              />
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }} 
              className={`p-3 rounded-lg bg-gradient-to-r ${getTypeColor('NECKLACE')} bg-opacity-10 backdrop-blur-sm`}
            >
              <h3 className="text-center font-semibold mb-2 text-white">{t("necklace", language)}</h3>
              <EquipmentSlot 
                type="NECKLACE" 
                equipment={getEquippedByType("NECKLACE")} 
                onClick={() => handleSlotClick("NECKLACE")}
                className="mx-auto"
              />
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.05 }} 
              className={`p-3 rounded-lg bg-gradient-to-r ${getTypeColor('BOOTS')} bg-opacity-10 backdrop-blur-sm`}
            >
              <h3 className="text-center font-semibold mb-2 text-white">{t("boots", language)}</h3>
              <EquipmentSlot 
                type="BOOTS" 
                equipment={getEquippedByType("BOOTS")} 
                onClick={() => handleSlotClick("BOOTS")}
                className="mx-auto"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Section droite: Détails de l'équipement ou liste des équipements disponibles */}
        <motion.div 
          variants={itemVariants}
          className="w-full lg:w-1/3"
        >
          <ModernCard className="h-full backdrop-blur-sm">
            {selectedEquipment ? (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {selectedEquipment.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark' ? 'bg-purple-900/60 text-purple-200' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {t(selectedEquipment.rarity.toLowerCase(), language) || selectedEquipment.rarity}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark' ? 'bg-blue-900/60 text-blue-200' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {t(selectedEquipment.type.toLowerCase(), language) || selectedEquipment.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      theme === 'dark' ? 'bg-green-900/60 text-green-200' : 'bg-green-100 text-green-800'
                    }`}>
                      {t("level", language)} {selectedEquipment.level}
                    </span>
                  </div>
                </div>

                <EquipmentDetailsPanel
                  equipment={selectedEquipment}
                  currentHeroId={parseInt(heroId)}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />

                <div className="mt-4">
                  <ModernButton
                    variant="secondary"
                    onClick={() => setSelectedEquipment(null)}
                    icon={<FaArrowLeft />}
                    className="w-full"
                  >
                    {t("backToList", language)}
                  </ModernButton>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {selectedSlot  
                    ? `${t("availableEquipment", language)} (${t(selectedSlot.toLowerCase(), language)})`  
                    : t("selectSlot", language)}
                </h2>

                {selectedSlot && (
                  <div className={`p-3 mb-4 rounded-lg ${
                    theme === 'dark' ? 'bg-indigo-900/30 backdrop-blur-sm border border-indigo-700/30' : 'bg-indigo-50 border border-indigo-100'
                  }`}>
                    <p className="text-center">
                      {t("selectEquipmentHelp", language)}
                    </p>
                  </div>
                )}

                {selectedSlot && filteredAvailable.length > 0 ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredAvailable.map((eq) => (
                      <motion.div
                        key={eq.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedEquipment(eq)}
                        className={`cursor-pointer p-3 rounded-lg transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'bg-indigo-900/30 hover:bg-indigo-800/40 backdrop-blur-sm border border-indigo-700/30' 
                            : 'bg-white hover:bg-indigo-50 border border-indigo-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{eq.name}</p>
                            <p className="text-sm text-slate-400 dark:text-slate-300">
                              {t(eq.rarity.toLowerCase(), language)} • {t("level", language)} {eq.level}
                            </p>
                          </div>
                          <FaInfoCircle className={`${
                            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                          }`} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : selectedSlot ? (
                  <div className="p-8 text-center">
                    <FaInfoCircle className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-400 dark:text-slate-300">{t("noEquipmentAvailable", language)}</p>
                    <p className="text-sm text-slate-400 dark:text-slate-400 mt-2">{t("findMoreEquipment", language)}</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <GiArmorUpgrade className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-400 dark:text-slate-300">{t("selectSlotToSeeEquipment", language)}</p>
                  </div>
                )}
              </>
            )}
          </ModernCard>
        </motion.div>
      </motion.div>
      
      {/* Contrôleur de musique */}
      <MusicController />
    </ModernPageLayout>
  );
};

export default HeroView;
