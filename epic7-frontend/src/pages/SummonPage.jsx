import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { performSummon, getBannerHeroes, getOwnedHeroes, getBannerEquipments, getRarestHero } from "../services/summonService";
import API from "../api/axiosInstance";
import { useSettings } from "../context/SettingsContext";
import ModernPageLayout from "../components/ui/ModernPageLayout";
import ModernCard from "../components/ui/ModernCard";
import ModernButton from "../components/ui/ModernButton";
import ModernModal from "../components/ui/ModernModal";
import { FaGem, FaMagic, FaStar, FaBolt, FaEye, FaGift } from "react-icons/fa";

export default function SummonPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeBanners, setActiveBanners] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [bannerHeroes, setBannerHeroes] = useState([]);
  const [bannerEquipments, setBannerEquipments] = useState([]);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [ownedHeroes, setOwnedHeroes] = useState([]);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [rarestHero, setRarestHero] = useState(null);
  const [summonAnimation, setSummonAnimation] = useState(false);
  const { theme, t, language } = useSettings();

  
  // Récupérer le nombre de gemmes de l'utilisateur
  useEffect(() => {
    const fetchUserDiamonds = async () => {
      try {
        const response = await API.get("/user/diamonds");
        setUserDiamonds(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des gemmes :", error);
      }
    };
  
    fetchUserDiamonds();
  }, []);

  useEffect(() => {
    // Récupérer les bannières actives au chargement de la page
    const fetchActiveBanners = async () => {
      try {
        const response = await API.get("/summons/active-banners");
        console.log("Bannières actives récupérées :", response.data);
        // S'assurer que c'est un tableau
        setActiveBanners(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Erreur lors de la récupération des bannières actives :", error);
        setActiveBanners([]); // Valeur par défaut en cas d'erreur
      }
    };

    fetchActiveBanners();
  }, []);

  useEffect(() => {
    // Récupérer les héros possédés par l'utilisateur au chargement de la page
    const fetchOwnedHeroes = async () => {
      try {
        const heroes = await getOwnedHeroes();
        console.log("Héros possédés récupérés :", heroes);
        // S'assurer que c'est un tableau
        setOwnedHeroes(Array.isArray(heroes) ? heroes : []);
      } catch (error) {
        console.error("Erreur lors de la récupération des héros possédés :", error);
        setOwnedHeroes([]); // Valeur par défaut en cas d'erreur
      }
    };

    fetchOwnedHeroes();
  }, []);

  // Récupérer les héros et équipements de la bannière sélectionnée
  const handleBannerClick = async (banner) => {
    setSelectedBanner(banner);
    try {
      const heroes = await getBannerHeroes(banner.id);
      const equipments = await getBannerEquipments(banner.id);
      const rareHero = await getRarestHero(banner.id);
      
      // S'assurer que les données sont des tableaux
      setBannerHeroes(Array.isArray(heroes) ? heroes : []);
      setBannerEquipments(Array.isArray(equipments) ? equipments : []);
      setRarestHero(rareHero);
      setShowBannerModal(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des contenus de la bannière :", error);
      setBannerHeroes([]);
      setBannerEquipments([]);
    }
  };
  
  // Sélectionner une bannière et récupérer le héros le plus rare
  const handleBannerSelect = async (banner) => {
    setSelectedBanner(banner);  
    try {
      const rareHero = await getRarestHero(banner.id);
      setRarestHero(rareHero);
    } catch (error) {
      console.error("Erreur lors de la récupération du héros le plus rare :", error);
    }
  };

  const closeBannerModal = () => {
    setShowBannerModal(false);
  };

  // Pour invoquer un héros ou un équipement
  const handleSummon = async () => {
    if (!selectedBanner) {
      setResult({ error: true, message: "❌ Il faut sélectionner une bannière avant d'invoquer." });
      return;
    }

    setResult(null);
    setLoading(true);
    setSummonAnimation(true);
    
    try {
      const summonResult = await performSummon(selectedBanner.id);
      
      // Délai pour l'animation
      setTimeout(() => {
        setResult(summonResult);
        setSummonAnimation(false);
        
        // Mettre à jour les gemmes restantes
        const updatedDiamonds = userDiamonds - selectedBanner.cout >= 0 ? userDiamonds - selectedBanner.cout : userDiamonds;
        setUserDiamonds(updatedDiamonds);

        // Recharger les héros possédés
        getOwnedHeroes().then(heroes => {
          setOwnedHeroes(Array.isArray(heroes) ? heroes : []);
        }).catch(error => {
          console.error("Erreur lors du rechargement des héros :", error);
          setOwnedHeroes([]);
        });
      }, 2000);
      
    } catch (error) {
      setSummonAnimation(false);
      if (error.response && error.response.data && error.response.data.message) {
        setResult({ error: true, message: error.response.data.message });
      } else {
        setResult({ error: true, message: "❌ Une erreur inattendue s'est produite." });
      }
    } finally {
      setLoading(false);
    }
  };

  // Variantes d'animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
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

  const summonVariants = {
    idle: { scale: 1, rotate: 0 },
    summoning: { 
      scale: [1, 1.1, 1],
      rotate: [0, 360, 720],
      transition: { 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <ModernPageLayout 
      title="🔮 Invocation"
      subtitle="Découvrez de nouveaux héros et équipements"
      backTo="/dashboard"
    >
      <motion.div
        className="min-h-screen relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Effets de particules de fond */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
          {/* Section principale - Invocation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Affichage des gemmes */}
            <motion.div variants={itemVariants}>
              <ModernCard className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <FaGem className="text-2xl text-blue-400" />
                  <span className="text-2xl font-bold">{userDiamonds}</span>
                  <span className="text-lg opacity-80">Gemmes</span>
                </div>
              </ModernCard>
            </motion.div>

            {/* Zone d'invocation principale */}
            <motion.div variants={itemVariants}>
              <ModernCard className="text-center p-8">
                <AnimatePresence mode="wait">
                  {summonAnimation ? (
                    <motion.div
                      key="summoning"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex flex-col items-center space-y-4"
                    >
                      <motion.div
                        variants={summonVariants}
                        animate="summoning"
                        className="text-6xl"
                      >
                        🔮
                      </motion.div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Invocation en cours...
                      </h3>
                      <p className="text-lg opacity-80">Les forces mystiques œuvrent...</p>
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -50 }}
                      className="space-y-6"
                    >
                      {result.error ? (
                        <div className="text-red-400 text-xl">{result.message}</div>
                      ) : (
                        <>
                          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                            Résultat de l'invocation
                          </h2>
                          <div className="flex flex-col items-center space-y-4">
                            <motion.img
                              src={
                                result.type === "Hero"
                                  ? `/epic7-Hero/webp/${result.name.toLowerCase().replace(/\s+/g, "-")}.webp`
                                  : `/equipment/${result.name.toLowerCase().replace(/\s+/g, "-")}.webp`
                              }
                              alt={result.name}
                              className="w-48 h-48 object-contain rounded-2xl shadow-2xl"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/epic7-Hero/webp/unknown.webp";
                              }}
                              initial={{ scale: 0, rotate: 180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 200, 
                                damping: 15,
                                delay: 0.2 
                              }}
                            />
                            <div className="text-center space-y-2">
                              <h3 className="text-2xl font-bold">{result.name}</h3>
                              <div className="flex items-center justify-center gap-2">
                                <FaStar className="text-yellow-400" />
                                <span className="text-lg">{result.rarity}</span>
                              </div>
                              <p className="text-lg">{result.element}</p>
                              
                              {result.type === "Hero" && (
                                <div className="space-y-2">
                                  <p className="text-green-400 font-semibold">
                                    Niveau d'éveil : {result.awakeningLevel}
                                  </p>
                                  {result.awakeningLevel === 0 ? (
                                    <p className="text-blue-400 flex items-center justify-center gap-2">
                                      <FaGift /> Nouveau héros débloqué !
                                    </p>
                                  ) : (
                                    <p className="text-yellow-400 flex items-center justify-center gap-2">
                                      <FaBolt /> Éveil amélioré !
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {result.type === "Equipment" && (
                                <p className="text-purple-400 flex items-center justify-center gap-2">
                                  <FaGift /> Nouvel équipement obtenu !
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-6"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="text-8xl"
                      >
                        🔮
                      </motion.div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Prêt pour l'invocation
                      </h2>
                      <p className="text-lg opacity-80">
                        {selectedBanner ? 
                          `Bannière sélectionnée : ${selectedBanner.name}` : 
                          "Sélectionnez une bannière pour commencer"
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bouton d'invocation */}
                <motion.div 
                  variants={itemVariants}
                  className="mt-8"
                >
                  <ModernButton
                    variant="primary"
                    size="lg"
                    onClick={handleSummon}
                    disabled={loading || !selectedBanner || summonAnimation}
                    loading={loading}
                    icon={<FaMagic />}
                    className="text-xl px-8 py-4"
                  >
                    {loading ? "Invocation..." : "Invoquer"}
                  </ModernButton>
                </motion.div>
              </ModernCard>
            </motion.div>

            {/* Héros vedette de la bannière */}
            <AnimatePresence>
              {selectedBanner && rarestHero && (
                <motion.div
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  variants={itemVariants}
                >
                  <ModernCard className="p-6">
                    <div className="flex items-center space-x-4">
                      <motion.img
                        src={`/epic7-Hero/webp/${rarestHero.name.toLowerCase().replace(/\s+/g, "-")}.webp`}
                        alt={rarestHero.name}
                        className="w-24 h-24 object-contain rounded-xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/epic7-Hero/webp/unknown.webp";
                        }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                      <div>
                        <h3 className="text-xl font-bold text-yellow-400">Héros Vedette</h3>
                        <p className="text-lg font-semibold">{rarestHero.name}</p>
                        <p className="text-sm opacity-80">{rarestHero.rarity} • {rarestHero.element}</p>
                        <p className="text-sm text-purple-400">Obtenez-le dès maintenant !</p>
                      </div>
                    </div>
                  </ModernCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section droite - Bannières */}
          <motion.div variants={itemVariants} className="space-y-4">
            <ModernCard className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Bannières Actives
              </h2>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {Array.isArray(activeBanners) && activeBanners.map((banner, index) => (
                    <motion.div
                      key={banner.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ModernCard
                        className={`p-4 cursor-pointer transition-all duration-300 ${
                          selectedBanner?.id === banner.id
                            ? 'ring-2 ring-blue-400 bg-blue-500/20'
                            : 'hover:bg-purple-500/10'
                        }`}
                        onClick={() => handleBannerSelect(banner)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">{banner.name}</h3>
                          <div className="text-sm opacity-80">
                            <p>Début: {new Intl.DateTimeFormat("fr-FR", { 
                              dateStyle: "short", 
                              timeStyle: "short" 
                            }).format(new Date(banner.startsAt))}</p>
                            <p>Fin: {new Intl.DateTimeFormat("fr-FR", { 
                              dateStyle: "short", 
                              timeStyle: "short" 
                            }).format(new Date(banner.endsAt))}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FaGem className="text-blue-400" />
                              <span className="font-semibold">{banner.cout}</span>
                            </div>
                            <ModernButton
                              variant="accent"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBannerClick(banner);
                              }}
                              icon={<FaEye />}
                            >
                              Contenu
                            </ModernButton>
                          </div>
                        </div>
                      </ModernCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ModernCard>
          </motion.div>
        </div>

        {/* Modal pour afficher le contenu de la bannière */}
        <ModernModal
          isOpen={showBannerModal}
          onClose={closeBannerModal}
          title={`Contenu de la bannière : ${selectedBanner?.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Héros */}
            {Array.isArray(bannerHeroes) && bannerHeroes.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4 text-purple-400">Héros disponibles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {bannerHeroes.map((hero) => {
                    // S'assurer que ownedHeroes est un tableau
                    const ownedHeroesArray = Array.isArray(ownedHeroes) ? ownedHeroes : [];
                    const ownedHero = ownedHeroesArray.find((h) => h.hero?.id === hero.id);
                    return (
                      <motion.div
                        key={hero.id}
                        className="text-center space-y-2"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <img
                            src={`/epic7-Hero/webp/${hero.name.toLowerCase().replace(/\s+/g, "-")}.webp`}
                            alt={hero.name}
                            className="w-20 h-20 object-contain rounded-lg mx-auto"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/epic7-Hero/webp/unknown.webp";
                            }}
                          />
                          {ownedHero && (
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                              ✓
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{hero.name}</p>
                          <p className="text-xs opacity-80">{hero.rarity}</p>
                          {ownedHero ? (
                            <p className="text-xs text-green-400">
                              Éveil: {ownedHero.awakeningLevel}
                            </p>
                          ) : (
                            <p className="text-xs text-red-400">Non possédé</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Équipements */}
            {Array.isArray(bannerEquipments) && bannerEquipments.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4 text-orange-400">Équipements disponibles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {bannerEquipments.map((equipment) => (
                    <motion.div
                      key={equipment.id}
                      className="text-center space-y-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <img
                        src={`/equipment/${equipment.name.toLowerCase().replace(/\s+/g, "-")}.webp`}
                        alt={equipment.name}
                        className="w-20 h-20 object-contain rounded-lg mx-auto"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/epic7-Hero/webp/unknown.webp";
                        }}
                      />
                      <div>
                        <p className="font-semibold text-sm">{equipment.name}</p>
                        <p className="text-xs opacity-80">{equipment.rarity}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ModernModal>
      </motion.div>
    </ModernPageLayout>
  );
}