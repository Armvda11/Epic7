import React, { useState, useEffect, use } from "react";
import { useNavigate } from "react-router-dom";
import { performSummon, getBannerHeroes, getOwnedHeroes, getBannerEquipments } from "../services/summonService";
import API from "../api/axiosInstance";
import '../SummonPage.css';

export default function SummonPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeBanners, setActiveBanners] = useState([]); // État pour les bannières actives
  const [selectedBanner, setSelectedBanner] = useState(null); // Bannière sélectionnée
  const [bannerHeroes, setBannerHeroes] = useState([]); // Héros de la bannière sélectionnée
  const [bannerEquipments, setBannerEquipments] = useState([]); // Équipements de la bannière sélectionnée
  const [showBannerHeroes, setShowBannerHeroes] = useState(false); // État pour afficher la fenêtre
  const [ownedHeroes, setOwnedHeroes] = useState([]); // Héros possédés par l'utilisateur
  const [userDiamonds, setUserDiamonds] = useState(0); // État pour les gemmes
  const navigate = useNavigate();

  
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
        setActiveBanners(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des bannières actives :", error);
      }
    };

    fetchActiveBanners();
  }, []);

  useEffect(() => {
    const fetchOwnedHeroes = async () => {
      try {
        const heroes = await getOwnedHeroes();
        console.log("Héros possédés récupérés :", heroes);
        setOwnedHeroes(heroes);
      } catch (error) {
        console.error("Erreur lors de la récupération des héros possédés :", error);
      }
    };

    fetchOwnedHeroes();
  }, []);

  const handleBannerClick = async (banner) => {
    setSelectedBanner(banner);
    try {
      const heroes = await getBannerHeroes(banner.id); // Récupérer les héros de la bannière
      const equipments = await getBannerEquipments(banner.id); // Récupérer les équipements de la bannière
      setBannerHeroes(heroes);
      setBannerEquipments(equipments);
      setShowBannerHeroes(true); // Ouvrir la fenêtre
    } catch (error) {
      console.error("Erreur lors de la récupération des contenus de la bannière :", error);
      setBannerHeroes([]);
      setBannerEquipments([]);
    }
  };

  const closeBannerHeroes = () => {
    setShowBannerHeroes(false); // Fermer la fenêtre
  };

  const handleSummon = async () => {
    if (!selectedBanner) {
      setResult({ error: true, message: "❌ Il faut sélectionner une bannière avant d'invoquer." });
      return;
    }

    setResult(null);
    setLoading(true);
    try {
      const summonResult = await performSummon(selectedBanner.id); // Passer l'ID de la bannière sélectionnée
      setResult(summonResult); // Affiche le résultat si l'invocation réussit

      // Mettre à jour les gemmes restantes
      const updatedDiamonds = userDiamonds - selectedBanner.cout >= 0 ? userDiamonds - selectedBanner.cout : userDiamonds;
      setUserDiamonds(updatedDiamonds);

      // Recharger les héros possédés
      const heroes = await getOwnedHeroes();
      setOwnedHeroes(heroes);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setResult({ error: true, message: error.response.data.message });
      } else {
        setResult({ error: true, message: "❌ Une erreur inattendue s'est produite." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen bg-gradient-to-br from-purple-900 to-black text-white p-6">
      {/* Bouton Retour */}
      <button
        onClick={() => navigate("/dashboard")}
        className="absolute top-4 left-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
      >
        Retour
      </button>
      {/* Contenu principal */}
      <div className="flex h-full">
        {/* Section gauche : Titre et contenu principal */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-6">🔮 Invocation 🔮</h1>

          {result && (
            <div className="mt-6 text-center">
              {result.error ? (
                <p className="text-xl text-red-500">{result.message}</p>
              ) : (
                <>
                  <h2 className="text-3xl font-bold">Résultat de l'invocation :</h2>
                  <div className="flex flex-col items-center">
                    <img
                      src={
                        result.type === "Hero"
                          ? `/epic7-Hero/sprite-hero/${result.name.toLowerCase().replace(/\s+/g, "-")}.png`
                          : `/equipment/${result.name.toLowerCase().replace(/\s+/g, "-")}.webp`
                      }
                      alt={result.name}
                      className={`mt-4 w-40 h-40 object-contain rounded-lg shadow-lg ${ 
                        !result.error && result.type === "Hero" ? "hero-glow" : result.type === "Equipment" 
                        ? "equip-glow" : ""
                      }`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/epic7-Hero/sprite-hero/unknown.png"
                      }}
                    />
                    <p className="text-xl font-bold mt-4">{result.name}</p>
                    <p className="text-lg">{result.rarity}</p>
                    <p className="text-lg">{result.element}</p>
                    {result.type === "Hero" && (
                      <>
                        <p className="text-lg text-green-500">
                          Niveau d'éveil : {result.awakeningLevel}
                        </p>
                        {result.awakeningLevel === 0 ? (
                          <p className="text-lg text-blue-500 mt-2">
                            🎉 Nouveau héros débloqué !
                          </p>
                        ) : (
                          <p className="text-lg text-yellow-500 mt-2">
                            🔄 Vous possédez déjà ce héros, son niveau d'éveil augmente de 1 !
                          </p>
                        )}
                      </>
                    )}
                    {result.type === "Equipment" && (
                      <p className="text-lg text-red-500 mt-2">🎉 Nouvel équipement obtenu !</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleSummon}
            disabled={loading}
            className="mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-xl font-bold shadow-lg"
          >
            {loading ? "Invocation en cours..." : "Invoquer un héros ou un équipement"}
          </button>
          {/* Afficher le nombre de gemmes restante */}
          <div className="bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg">
            <p className="text-lg font-bold ml-2">💎 {userDiamonds}</p>
          </div>
        </div>

        {/* Section droite : Liste des bannières */}
        <div className="w-1/3 flex flex-col items-center space-y-4">
          <h2 className="text-2xl font-bold mb-4">Bannières actives :</h2>
          {activeBanners.map((banner) => (
            <div key={banner.id} className="flex items-center w-full space-x-4">
              {/* Conteneur de la bannière */}
              <div
                className={`p-4 rounded-lg shadow-lg cursor-pointer flex-1 ${
                  selectedBanner?.id === banner.id
                    ? "bg-blue-500 text-white border-4 border-blue-700 shadow-xl"
                    : "bg-purple-600 text-white"
                }`}
                onClick={() => setSelectedBanner(banner)}
              >
                <h3 className="text-xl font-bold">{banner.name}</h3>
                <p className="text-sm">Début : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(banner.startsAt))}</p>
                <p className="text-sm">Fin :  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(banner.endsAt))}</p>
                <p className="text-sm font-bold">💎 Coût : {banner.cout} diamants</p>
              </div>

              {/* Bouton pour afficher le contenu */}
              <button
                onClick={() => handleBannerClick(banner)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center justify-center"
                style={{ height: "100%" }}
              >
                Voir contenu
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fenêtre flottante pour afficher les héros */}
      {showBannerHeroes && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="absolute inset-0" onClick={closeBannerHeroes} />
          <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto relative z-50">
            <button
              onClick={closeBannerHeroes}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            >
              ✖
            </button>
            <h2 className="text-2xl font-bold mb-4">Héros de la bannière : {selectedBanner.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {bannerHeroes.map((hero) => {
                const ownedHero = ownedHeroes.find((h) => h.hero.id === hero.id);
                return (
                  <div key={hero.id} className="text-center flex flex-col items-center">
                    <img
                      src={`/epic7-Hero/sprite-hero/${hero.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                      alt={hero.name}
                      className="w-24 h-24 object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/epic7-Hero/sprite-hero/unknown.png"; // Image par défaut en cas d'erreur
                      }}
                    />
                    <p className="text-lg font-bold mt-2">{hero.name}</p>
                    <p className="text-sm">{hero.rarity}</p>
                    {ownedHero ? (
                      <p className="text-sm text-green-500">
                        Possédé (Niveau d'éveil : {ownedHero.awakeningLevel})
                      </p>
                    ) : (
                      <p className="text-sm text-red-500">Non possédé</p>
                    )}
                  </div>
                );
              })}

              {bannerEquipments.map((equipment) => (
                <div key={equipment.id} className="text-center flex flex-col items-center">
                  <img
                    src={`/equipment/${equipment.name.toLowerCase().replace(/\s+/g, "-")}.webp`}
                    alt={equipment.name}
                    className="w-24 h-24 object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/epic7-Hero/sprite-hero/unknown.png"
                    }}
                  />
                  <p className="text-lg font-bold mt-2">{equipment.name}</p>
                  <p className="text-sm">{equipment.rarity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}