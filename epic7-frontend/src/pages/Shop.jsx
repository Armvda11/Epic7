import { useState, useEffect } from "react";
import { getShopItems } from "../services/shopService"; // Assurez-vous d'importer la fonction API

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

  // Fonction pour récupérer les items depuis le backend
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getShopItems(); // Appel à l'API pour récupérer les items
        setItems(data);
      } catch (err) {
        setError("Impossible de récupérer les articles.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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

  if (loading) return <p>Chargement des articles...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div
      className="p-6 max-w-8xl mx-auto min-h-screen bg-blue-200 bg-cover bg-center"
    >
      <h1 className="text-3xl font-bold mb-4 text-white text-center">Shop</h1>

      {/* Barre de recherche, filtre et bouton Retour */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => window.history.back()} // Retour à la page précédente
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          ⬅️ Retour
        </button>
        <input
          type="text"
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <select
          className="border p-2 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="Tous">Tous</option>
          <option value="HEROS">Héros</option>
          <option value="EQUIPMENT">Équipement</option>
          <option value="GOLD">Or</option>
        </select>
      </div>

      {/* Affichage des articles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredItems.map((item, index) => (
          <div key={index} className="p-4 shadow-lg rounded-xl border bg-white bg-opacity-80">
            <div className="flex flex-col items-center">
              <img
                src={`/Shop/${formatImageName(item.name)}.webp`}
                alt={item.name}
                className="w-24 h-24 mb-2"
              />
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="text-gray-600 italic">{item.description}</p>
              <p className="text-gray-600 flex grap-x-8">
                <span>{item.priceInGold} 🟡</span> &nbsp;&nbsp;&nbsp; {item.priceInDiamonds} 💎</p>

              {/* Affichage du compte à rebours si l'article a une date de fin */}
              {item.endAt && (
                <p className="text-red-500 font-bold">
                  ⏳ Expire dans : {timeLefts[item.name] || "Calcul..."}
                </p>
              )}

              <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                🛒 Acheter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
