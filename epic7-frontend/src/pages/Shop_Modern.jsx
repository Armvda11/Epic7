import { useState, useEffect } from "react";
import { getShopItems } from "../services/shopService";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { buyItem } from "../services/shopService";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar } from "../components/ui";
import { FaFilter, FaShoppingCart, FaCoins, FaGem, FaClock } from "react-icons/fa";

// Fonction pour formater le nom de l'image
const formatImageName = (name) => {
  return name.toLowerCase().replace(/\s+/g, "-");
};

//Fonction pour recuperer le chemin en fonction du type d'item
const getItemPath = (type) => {
  switch (type) {
    case "HERO":
      return "epic7-Hero/webp";
    case "EQUIPMENT":
      return "equipment";
    case "GOLD":
      return "gold";
    case "DIAMOND":
      return "diamond";
    default:
      return "";
  }
};

// Fonction pour calculer le temps restant
const getTimeLeft = (endAt) => {
  const now = new Date();
  const endDate = new Date(endAt);
  const diff = endDate - now;

  if (diff <= 0) return "Expiré";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

export default function ShopPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLefts, setTimeLefts] = useState({});

  const navigate = useNavigate();
  const { t, language, theme } = useSettings();

  useEffect(() => {
    (async () => {
      try {
        const data = await getShopItems();
        setItems(data);
      } catch (err) {
        setError(t("shopLoadError", language) || "Erreur lors du chargement des articles");
      } finally {
        setLoading(false);
      }
    })();
  }, [language]);

  // Mettre à jour les temps restants
  useEffect(() => {
    const updateTimeLefts = () => {
      const newTimeLefts = {};
      items.forEach(item => {
        if (item.endAt) {
          newTimeLefts[item.id] = getTimeLeft(item.endAt);
        }
      });
      setTimeLefts(newTimeLefts);
    };

    updateTimeLefts();
    const interval = setInterval(updateTimeLefts, 1000);
    return () => clearInterval(interval);
  }, [items]);

  const handleBuyItem = async (itemId, itemPrice, itemCurrency) => {
    try {
      await buyItem(itemId, itemPrice, itemCurrency);
      toast.success(t("itemPurchased", language) || "Article acheté avec succès!");
      
      // Recharger les articles pour mettre à jour les stocks
      const data = await getShopItems();
      setItems(data);
    } catch (error) {
      console.error("Erreur achat:", error);
      toast.error(error.response?.data?.message || t("purchaseError", language) || "Erreur lors de l'achat");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Tous" || item.type === filter;
    return matchSearch && matchFilter;
  });

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <ModernPageLayout 
        title={t("shop", language)} 
        subtitle="Chargement..."
        showBackButton={false}
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
            <FaShoppingCart className="w-8 h-8 text-purple-500" />
          </motion.div>
        </div>
      </ModernPageLayout>
    );
  }
  
  if (error) {
    return (
      <ModernPageLayout 
        title={t("shop", language)} 
        subtitle="Erreur de chargement"
        showBackButton={false}
      >
        <ModernCard className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <ModernButton 
            variant="primary" 
            onClick={() => window.location.reload()}
          >
            Réessayer
          </ModernButton>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center space-x-2">
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className={`px-3 py-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-white/10 border-white/20 text-white' 
            : 'bg-white/60 border-white/40 text-gray-800'
        }`}
      >
        <option value="Tous">{t("all", language) || "Tous"}</option>
        <option value="HERO">{t("heroes", language) || "Héros"}</option>
        <option value="EQUIPMENT">{t("equipment", language) || "Équipement"}</option>
        <option value="GOLD">{t("gold", language) || "Or"}</option>
        <option value="DIAMOND">{t("diamonds", language) || "Diamants"}</option>
      </select>
    </div>
  );

  return (
    <ModernPageLayout 
      title={t("shop", language)}
      subtitle="Découvrez nos offres exclusives"
      headerActions={headerActions}
    >
      {/* Barre de recherche moderne */}
      <ModernSearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("searchItem", language) || "Rechercher un article..."}
        className="mb-8 max-w-2xl mx-auto"
      />

      {/* Grille d'articles */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredItems.map((item, index) => (
          <motion.div key={item.id} variants={itemVariants}>
            <ModernCard className="h-full flex flex-col">
              {/* Image de l'article */}
              <div className="flex justify-center mb-4">
                <img
                  src={`/${getItemPath(item.type)}/${formatImageName(item.name)}.webp`}
                  alt={item.name}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    e.target.src = "/placeholder-item.png";
                  }}
                />
              </div>

              {/* Informations de l'article */}
              <div className="flex-1 flex flex-col">
                <h3 className={`text-lg font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.name}
                </h3>
                
                <p className={`text-sm mb-4 flex-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {item.description}
                </p>

                {/* Prix et devise */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {item.currency === "GOLD" ? (
                      <FaCoins className="text-yellow-500" />
                    ) : (
                      <FaGem className="text-purple-500" />
                    )}
                    <span className={`font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {item.price}
                    </span>
                  </div>
                  
                  {item.stock !== null && (
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Stock: {item.stock}
                    </span>
                  )}
                </div>

                {/* Temps restant si applicable */}
                {item.endAt && (
                  <div className="flex items-center space-x-2 mb-4">
                    <FaClock className="text-orange-500" />
                    <span className={`text-sm ${
                      timeLefts[item.id] === "Expiré" 
                        ? 'text-red-500' 
                        : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {timeLefts[item.id] || "Calculé..."}
                    </span>
                  </div>
                )}

                {/* Bouton d'achat */}
                <ModernButton
                  variant={item.stock === 0 || timeLefts[item.id] === "Expiré" ? "secondary" : "accent"}
                  disabled={item.stock === 0 || timeLefts[item.id] === "Expiré"}
                  onClick={() => handleBuyItem(item.id, item.price, item.currency)}
                  icon={<FaShoppingCart />}
                  className="w-full"
                >
                  {item.stock === 0 
                    ? t("outOfStock", language) || "Rupture de stock"
                    : timeLefts[item.id] === "Expiré"
                    ? t("expired", language) || "Expiré"
                    : t("buy", language) || "Acheter"
                  }
                </ModernButton>
              </div>
            </ModernCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Message si aucun article */}
      {filteredItems.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <ModernCard className="max-w-md mx-auto">
            <FaShoppingCart className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Aucun article trouvé
            </h3>
            <p className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </ModernCard>
        </motion.div>
      )}
    </ModernPageLayout>
  );
}
