import { useState, useEffect } from "react";
import { getShopItems } from "../services/shopService";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import { buyItem } from "../services/shopService";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar } from "../components/ui";
import { FaFilter, FaShoppingCart, FaCoins, FaGem, FaClock } from "react-icons/fa";
import "./Shop.css";

// Fonction pour formater le nom de l'image
const formatImageName = (name) => {
  return name.toLowerCase().replace(/\s+/g, "-");
};

// Fonction pour formater les prix avec séparateurs de milliers
const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR').format(price);
};

// Détermine les devises nécessaires pour un item
const getRequiredCurrencies = (item) => {
  const currencies = [];
  if (item.priceInDiamonds > 0) {
    currencies.push({ type: 'diamonds', amount: item.priceInDiamonds });
  }
  if (item.priceInGold > 0) {
    currencies.push({ type: 'gold', amount: item.priceInGold });
  }
  return currencies.length > 0 ? currencies : [{ type: 'free', amount: 0 }];
};

// Vérifie si l'utilisateur peut se permettre l'item
const canAffordItem = (item, user) => {
  if (!user) return false;
  const hasEnoughDiamonds = item.priceInDiamonds <= user.diamonds;
  const hasEnoughGold = item.priceInGold <= user.gold;
  return hasEnoughDiamonds && hasEnoughGold;
};

// Fonction de compatibilité - détermine la devise principale d'un article pour l'affichage réduit
const getPrimaryCurrency = (item) => {
  // Si l'article coûte des diamants, c'est la devise principale
  if (item.priceInDiamonds > 0) {
    return { currency: "DIAMOND", price: item.priceInDiamonds };
  }
  // Sinon, c'est de l'or
  return { currency: "GOLD", price: item.priceInGold };
};

// Fonction pour obtenir la variante du bouton selon la devise
const getButtonVariantForCurrency = (item, isDisabled) => {
  if (isDisabled) return "secondary";
  const { currency } = getPrimaryCurrency(item);
  return currency === "GOLD" ? "warning" : "primary";
};

// Fonction pour déterminer si un article est en promotion (prix < 100)
const isOnSale = (item) => {
  const { price } = getPrimaryCurrency(item);
  return price < 100;
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

  const handleBuyItem = async (itemId, item) => {
    try {
      await buyItem(itemId);
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
          <motion.div 
            key={item.id} 
            variants={itemVariants}
            whileHover={{ 
              y: -5,
              transition: { type: "spring", stiffness: 300, damping: 20 }
            }}
            className="group"
          >
            <ModernCard className={`h-full flex flex-col transition-all duration-300 group-hover:shadow-2xl group-hover:border-opacity-50 relative shop-card-hover ${
              isOnSale(item) ? 'promo-glow' : ''
            }`}>
              {/* Badge promotion */}
              {isOnSale(item) && (
                <div className="absolute top-2 right-2 z-10">
                  <motion.div
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🔥 PROMO
                  </motion.div>
                </div>
              )}
              
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

                {/* Prix et devise(s) */}
                <div className="mb-4">
                  {getRequiredCurrencies(item).map((currency, index) => (
                    <motion.div 
                      key={currency.type}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300 group-hover:scale-105 price-container ${
                        index > 0 ? 'mt-2' : ''
                      } ${
                        isOnSale(item) ? 'sale-price currency-shimmer' : ''
                      } ${
                        currency.type === "gold" 
                          ? theme === 'dark' 
                            ? 'bg-yellow-500/20 border border-yellow-500/30 group-hover:bg-yellow-500/30 group-hover:border-yellow-400/50' 
                            : 'bg-yellow-100/80 border border-yellow-300/50 group-hover:bg-yellow-200/90 group-hover:border-yellow-400/70'
                          : currency.type === "diamonds"
                            ? theme === 'dark'
                              ? 'bg-purple-500/20 border border-purple-500/30 group-hover:bg-purple-500/30 group-hover:border-purple-400/50'
                              : 'bg-purple-100/80 border border-purple-300/50 group-hover:bg-purple-200/90 group-hover:border-purple-400/70'
                            : theme === 'dark'
                              ? 'bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30 group-hover:border-green-400/50'
                              : 'bg-green-100/80 border border-green-300/50 group-hover:bg-green-200/90 group-hover:border-green-400/70'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="flex items-center space-x-2">
                        {currency.type === "gold" ? (
                          <FaCoins className={`${
                            theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                          } text-lg`} />
                        ) : currency.type === "diamonds" ? (
                          <FaGem className={`${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          } text-lg`} />
                        ) : (
                          <span className="text-lg">🆓</span>
                        )}
                        <span className={`font-bold text-lg ${
                          currency.type === "gold"
                            ? theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                            : currency.type === "diamonds"
                              ? theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                              : theme === 'dark' ? 'text-green-300' : 'text-green-700'
                        }`}>
                          {currency.amount === 0 ? "GRATUIT" : formatPrice(currency.amount)}
                        </span>
                        <span className={`text-sm font-medium ${
                          currency.type === "gold"
                            ? theme === 'dark' ? 'text-yellow-400/80' : 'text-yellow-600/80'
                            : currency.type === "diamonds"
                              ? theme === 'dark' ? 'text-purple-400/80' : 'text-purple-600/80'
                              : theme === 'dark' ? 'text-green-400/80' : 'text-green-600/80'
                        }`}>
                          {currency.type === "gold" ? "Or" : currency.type === "diamonds" ? "Diamants" : ""}
                        </span>
                      </div>
                      
                      {currency.type !== "free" && index === 0 && item.stock !== null && (
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          item.stock === 0 
                            ? theme === 'dark' 
                              ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                              : 'bg-red-100/80 border border-red-300/50 text-red-600'
                            : item.stock <= 5
                              ? theme === 'dark'
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
                                : 'bg-orange-100/80 border border-orange-300/50 text-orange-600'
                              : theme === 'dark'
                                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                : 'bg-green-100/80 border border-green-300/50 text-green-600'
                        }`}>
                          Stock: {item.stock}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {/* Affichage du stock si plus d'une devise et pas encore affiché */}
                  {getRequiredCurrencies(item).length > 1 && item.stock !== null && (
                    <div className={`flex justify-end mt-2`}>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        item.stock === 0 
                          ? theme === 'dark' 
                            ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
                            : 'bg-red-100/80 border border-red-300/50 text-red-600'
                          : item.stock <= 5
                            ? theme === 'dark'
                              ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
                              : 'bg-orange-100/80 border border-orange-300/50 text-orange-600'
                            : theme === 'dark'
                              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                              : 'bg-green-100/80 border border-green-300/50 text-green-600'
                      }`}>
                        Stock: {item.stock}
                      </div>
                    </div>
                  )}
                </div>

                {/* Avertissement pour prix mixte */}
                {getRequiredCurrencies(item).length > 1 && (
                  <div className={`mb-4 px-3 py-2 rounded-lg border-2 border-dashed ${
                    theme === 'dark' 
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' 
                      : 'bg-orange-50/80 border-orange-300/50 text-orange-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-sm font-medium">
                        Coût mixte : Nécessite TOUTES les devises affichées
                      </span>
                    </div>
                  </div>
                )}

                {/* Temps restant si applicable */}
                {item.endAt && (
                  <div className={`flex items-center space-x-2 mb-4 px-3 py-2 rounded-lg ${
                    timeLefts[item.id] === "Expiré"
                      ? theme === 'dark'
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-red-100/80 border border-red-300/50'
                      : theme === 'dark'
                        ? 'bg-orange-500/20 border border-orange-500/30'
                        : 'bg-orange-100/80 border border-orange-300/50'
                  }`}>
                    <FaClock className={`${
                      timeLefts[item.id] === "Expiré" ? 'text-red-500' : 'text-orange-500'
                    }`} />
                    <span className={`text-sm font-medium ${
                      timeLefts[item.id] === "Expiré" 
                        ? 'text-red-500 font-bold' 
                        : theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                    }`}>
                      {timeLefts[item.id] || "Calculé..."}
                    </span>
                  </div>
                )}

                {/* Bouton d'achat */}
                <ModernButton
                  variant={getButtonVariantForCurrency(item, item.stock === 0 || timeLefts[item.id] === "Expiré")}
                  disabled={item.stock === 0 || timeLefts[item.id] === "Expiré"}
                  onClick={() => handleBuyItem(item.id, item)}
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