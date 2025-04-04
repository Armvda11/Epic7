import { useState, useEffect } from "react";
import { getShopItems } from "../services/shopService";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

// Fonction pour formater le nom de l'image
const formatImageName = (name) => {
  return name.toLowerCase().replace(/\s+/g, "-");
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
  const { language, t } = useSettings();

  // Fonction pour récupérer les items depuis le backend
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getShopItems(); // Appel à l'API pour récupérer les items
        setItems(data);
      } catch (err) {
        setError(t("shopLoadError", language) || "Impossible de récupérer les articles.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [language, t]);

  // Fonction pour mettre à jour le compte à rebours
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLefts((prevTimeLefts) => {
        const updatedTimeLefts = {};
        items.forEach((item) => {
          if (item.endAt) {
            updatedTimeLefts[item.name] = getTimeLeft(item.endAt);
          }
        });
        return updatedTimeLefts;
      });
    }, 1000);

    return () => clearInterval(interval); // Nettoyage de l'intervalle
  }, [items]);

  // Filtrage des items en fonction de la recherche et du filtre sélectionné
  const filteredItems = items.filter(
    (item) =>
      (filter === "Tous" || item.type === filter) && // Filtre par catégorie
      item.name.toLowerCase().includes(search.toLowerCase()) // Recherche par nom
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
      <p>{t("loadingShop", language) || "Chargement des articles..."}</p>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
      <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900 bg-opacity-50 dark:bg-opacity-30 p-4 rounded-lg">{error}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-8xl mx-auto min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-4 text-center">{t("shop", language)}</h1>

      {/* Barre de recherche, filtre et bouton Retour */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          ⬅️ {t("back", language)}
        </button>
        <input
          type="text"
          placeholder={t("searchItem", language) || "Rechercher un article..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-1 bg-white dark:bg-[#2f2b50] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
        />
        <select
          className="border p-2 rounded bg-white dark:bg-[#2f2b50] text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="Tous">{t("all", language)}</option>
          <option value="HEROS">{t("heroes", language) || "Héros"}</option>
          <option value="EQUIPMENT">{t("equipment", language) || "Équipement"}</option>
          <option value="GOLD">{t("gold", language) || "Or"}</option>
        </select>
      </div>

      {/* Affichage des articles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredItems.map((item, index) => (
          <div key={index} className="p-4 shadow-lg rounded-xl border bg-white dark:bg-[#2f2b50] bg-opacity-80 dark:bg-opacity-100 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center">
              <img
                src={`/Shop/${formatImageName(item.name)}.webp`}
                alt={item.name}
                className="w-24 h-24 mb-2"
              />
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 italic">{item.description}</p>
              <p className="text-gray-600 dark:text-gray-300 flex grap-x-8">
                <span>{item.priceInGold} 🟡</span> &nbsp;&nbsp;&nbsp; {item.priceInDiamonds} 💎</p>

              {/* Affichage du compte à rebours si l'article a une date de fin */}
              {item.endAt && (
                <p className="text-red-500 dark:text-red-400 font-bold">
                  ⏳ {t("expiresIn", language) || "Expire dans"}: {timeLefts[item.name] || t("calculating", language) || "Calcul..."}
                </p>
              )}

              <button className="mt-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                🛒 {t("buy", language) || "Acheter"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
