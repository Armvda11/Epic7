// src/pages/Dashboard.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import { fetchUserProfile, searchUsers } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import MenuTile from "../components/MenuTile";
import ProfileCard from "../components/ProfileCard";
import SettingsPanel from "../components/settings/SettingsPanel";
import MailboxOverlay from "../components/MailboxOverlay/MailboxOverlay";
import { heroImg, heroImgUnknown } from "../components/heroUtils";

import { FaUserFriends, FaUsers, FaMagic, FaCrosshairs, FaBookOpen, FaBoxOpen, FaStar, FaComments, FaGlobeAmericas } from "react-icons/fa";
import { getAllHeroes } from "../services/summonService";

// Cette page affiche le tableau de bord de l'utilisateur
// Elle affiche les informations de l'utilisateur, un menu de navigation
// et un bouton de déconnexion
// Elle utilise le service d'authentification pour gérer la connexion et la déconnexion
// Elle utilise le service utilisateur pour récupérer les informations de l'utilisateur
const Dashboard = () => {
  const navigate = useNavigate();
  const settings = useSettings();

  const { language, t, theme } = settings;
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);

  // États pour la recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // États pour l'animation des héros
  const [allHeroes, setAllHeroes] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [videoSource, setVideoSource] = useState("");
  const videoRef = useRef(null);

  // Menu items for left side
  const leftMenuItems = [
    { label: t("inventory", language), icon: <FaBoxOpen size={28} />, action: () => navigate("/inventory") },
    { label: t("myHeroes", language), icon: <FaMagic size={28} />, action: () => navigate("/my-heroes") },
    { label: t("friends", language), icon: <FaUserFriends size={28} />, action: () => navigate("/friends") },
    { label: t("guilds", language), icon: <FaUsers size={28} />, action: () => navigate("/guilds") },
  ];

  // Menu items for right side
  const rightMenuItems = [
    { label: t("quests", language), icon: <FaBookOpen size={28} />, action: () => navigate("/battle") },
    { label: t("battle", language), icon: <FaCrosshairs size={28} />, action: () => navigate("/rta") },
    { label: t("shop", language), icon: <FaBoxOpen size={28} />, action: () => navigate("/shop") },
    { label: t("summon", language), icon: <FaStar size={28} />, action: () => navigate("/summons") },
  ];

  //  Chargement des infos utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile(); // Récupération des données utilisateur
        
        // If data is null, it means the user is not authenticated
        if (data === null) {
          console.log("User not authenticated, redirecting to login page");
          navigate("/"); // Redirect to login page
          return;
        }
        
        setUser(data); // Mise à jour de l'état avec les données utilisateur
      } catch (error) {
        console.error("Failed to load user profile:", error);
        // Redirection vers la page de connexion en cas d'erreur
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]);

  // Charger les héros des bannières actives
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const heroes = await getAllHeroes();
        setAllHeroes(heroes);
        console.log("Héros récupérés :", heroes);
      } catch (error) {
        console.error("Erreur de récupération des héros :", error);
        setAllHeroes([]);
      }
    };
    fetchHeroes();
  }, [navigate]);
  
  // Vérifie si la vidéo existe
  const checkVideoExists = async (videoUrl) => {
    try {
      const response = await fetch(videoUrl, { method: "GET" });
      const contentType = response.headers.get("Content-Type");
      if (!response.ok || response.status === 404 || !contentType?.includes("video")) {
        return false;
      }
      return true;
    } catch (error) {
      console.error("Erreur réseau :", error);
      return false;
    }
  };

  // mettre la vidéo du héros actuel
  useEffect(() => {
    if (currentHeroIndex >= allHeroes.length) {
      setCurrentHeroIndex(0); // Réinitialiser l'index si on dépasse le nombre de héros
    }
    if (allHeroes.length > 0) {
      const findNextAvailableHero = async (index, attempts = 0) => {
        if (attempts >= allHeroes.length) {
          console.warn("Attention pas de vidéos de héros !");
          return;
        }

        const heroName = allHeroes[index].name.toLowerCase().replace(/\s+/g, "-");
        const videoUrl = `/epic7-Hero/Animation/${heroName}.mp4`;
        const exists = await checkVideoExists(videoUrl);

        if (exists) {
          setVideoSource(videoUrl);
          setCurrentHeroIndex(index);
        } else {
          const nextIndex = (index + 1) % allHeroes.length;
          findNextAvailableHero(nextIndex, attempts + 1); // Passe au prochain héros
        }
      };

      findNextAvailableHero(currentHeroIndex);
    }
  }, [currentHeroIndex, allHeroes]);


  // passer à la vidéo suivante après la fin de la vidéo actuelle
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onended = () => {
        setCurrentHeroIndex((prevIndex) => (prevIndex + 1) % allHeroes.length);
      };
    }
  }, [videoSource, allHeroes]);


  // Fonction de recherche avec debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Nettoyer le timeout précédent
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Définir un nouveau timeout (debounce de 500ms)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(value);
        setSearchResults(results);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  // Gestion de la soumission de recherche
  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (searchResults.length === 0) {
      return;
    }

    if (searchResults.length === 1) {
      // Si un seul résultat, naviguer directement vers le profil
      navigate(`/profile/${searchResults[0].id}`);
      resetSearch();
    } else {
      // Si plusieurs résultats, afficher la liste complète
      setShowSearchResults(true);
    }
  };

  // Naviguer vers un profil spécifique
  const navigateToProfile = (userId) => {
    navigate(`/profile/${userId}`);
    resetSearch();
  };

  // Réinitialiser l'état de recherche
  const resetSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  // Fonction pour gérer la déconnexion
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
        {t("loadingProfile", language)}...
      </main>
    );
  }

  return (
    <main className="absolute inset-0 bg-cover bg-center overflow-hidden" style={{ backgroundImage: "url('splashArt.webp')" }}>
      <header className="flex justify-between items-center px-6 py-3">
        {/* Avatar (à gauche) */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => setShowProfile(true)}
            className="w-full max-w-xs p-4 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl hover:ring-2 ring-purple-400 transition text-left"
          >
            <article className="flex items-center gap-4">
              <img src={heroImg("mavuika")} alt="avatar" className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-600 object-cover shadow"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = heroImgUnknown;
                }}
              />
              <div>
                <h2 className="text-xl font-bold">{user.username}</h2>
                <p className="text-sm text-black-600 dark:text-orange-300">{t("level", language)} {user.level}</p>
              </div>
            </article>
          </button>

          {showProfile && (<ProfileCard user={user} onClose={() => setShowProfile(false)} />)}

          {/* Bouton pour ouvrir le chat global */}
          <button
            onClick={() => navigate("/global-chat")}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg"
            title={t("globalChat", language) || "Chat Global"}
          >
            <FaComments size={20} />
          </button>

          {/* Bouton flottant pour ouvrir les paramètres */}    
          <button
            onClick={() => setShowSettings(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg"
          >
            ⚙️
          </button>

          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
              <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
              <div className="relative z-50">
                <SettingsPanel />
              </div>
            </div>
          )}
        </div>

        {/* Ressources + Boîte de réception + Barre de recherche */}
        <div className="flex items-center gap-6">
          {/* Barre des ressources (compacte, à droite) */}
          <aside className="bg-black bg-opacity-40 px-4 py-2 rounded-lg flex gap-4 text-white text-sm">
            <p>💰 {user.gold}</p>
            <p>💎 {user.diamonds}</p>
            <p>⚡ {user.energy}</p>
          </aside>

          {/* Boîte de réception (à droite de la barre des ressources) */}
          <button
            onClick={() => setShowMailbox(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg"
          >
            📬
          </button>

          {showMailbox && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
              <div className="absolute inset-0" onClick={() => setShowMailbox(false)} />
              <div className="relative z-50">
                <MailboxOverlay onClose={() => setShowMailbox(false)} />
              </div>
            </div>
          )}

          {/* Barre de recherche (à droite de la boîte mail) */}
          <form onSubmit={handleSearchSubmit}
            className="w-full md:w-1/2 relative"
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t("searchPlayer", language)}
              className="w-full p-3 pl-10 bg-white dark:bg-[#2f2b50] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>

            {/* Résultats de recherche suggérés */}
            {searchTerm.length > 1 && !showSearchResults && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#2f2b50] rounded-lg shadow-xl border border-purple-500 max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.slice(0, 5).map((player) => (
                      <div
                        key={player.id}
                        onClick={() => navigateToProfile(player.id)}
                        className="p-3 hover:bg-purple-50 dark:hover:bg-[#3a3660] cursor-pointer flex items-center gap-3"
                      >
                        <img
                          src={heroImg("schniel") || heroImgUnknown}
                          alt=""
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = heroImgUnknown;
                          }}
                        />
                        <span>{player.username}</span>
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <div className="p-2 text-center text-sm text-purple-300">
                        {searchResults.length - 5} {t("moreResults", language)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 text-gray-400">
                    {!isSearching && (t("noPlayerWithName", language) || `No player with name "${searchTerm}" found`)}
                  </div>
                )}
              </div>
            )}

            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </form>
        </div>
      </header>

      {/* Disposition des menus */}
      <section className="flex justify-between gap-6 px-10">
        {/* Menu de gauche */}
        <div className="absolute left-0 flex flex-col gap-2 w-1/6">
          {leftMenuItems.map((item, index) => (
            <MenuTile key={index} label={item.label} icon={item.icon} onClick={item.action} index={index} />
          ))}
        </div>

        {/* Menu de droite */}
        <div className="absolute right-0 flex flex-col gap-2 w-1/6">
          {rightMenuItems.map((item, index) => (
            <MenuTile key={index} label={item.label} icon={item.icon} onClick={item.action} index={index} />
          ))}
        </div>
      </section>

      {/* Animation de héros */}
      <div className="absolute bottom-4 right-1 w-[300px] h-[100px]">
        {videoSource && (
          <video
            key={`${videoSource}-${Date.now()}`} autoPlay muted
            className="w-full h-full rounded-lg shadow-lg object-cover"
            ref={videoRef}
          >
            <source src={videoSource} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Déconnexion */}
      <footer className="absolute bottom-6 left-4 text-center">
        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition">
          Déconnexion
        </button>
      </footer>
    </main>
  );
};

export default Dashboard;
