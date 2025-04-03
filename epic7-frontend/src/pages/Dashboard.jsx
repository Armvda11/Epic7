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

import { FaUserFriends, FaUsers, FaMagic, FaCrosshairs, FaBookOpen, FaBoxOpen } from "react-icons/fa";

// Cette page affiche le tableau de bord de l'utilisateur
// Elle affiche les informations de l'utilisateur, un menu de navigation
// et un bouton de déconnexion
// Elle utilise le service d'authentification pour gérer la connexion et la déconnexion
// Elle utilise le service utilisateur pour récupérer les informations de l'utilisateur
const Dashboard = () => {
  const navigate = useNavigate();
  const { language, t, theme } = useSettings(); // Add theme from settings
  const [user, setUser] = useState(null);  // inormations de l'utilisateur
  const [showProfile, setShowProfile] = useState(false); // État pour afficher la carte de profil
  const [showSettings, setShowSettings] = useState(false); // État pour afficher le panneau de paramètres
  const [showMailbox, setShowMailbox] = useState(false); // État pour afficher la mailbox

  // États pour la recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  //  Chargement des infos utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile(); // Récupération des données utilisateur
        setUser(data); // Mise à jour de l'état avec les données utilisateur
      } catch (error) {
        console.error("Failed to load user profile:", error);
        // Redirection vers la page de connexion en cas d'erreur}
        navigate("/");
      }
    };
    loadUser();
  }, [navigate]);

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

  const menuItems = [
    { label: t("inventory", language), icon: <FaBoxOpen size={28} />, action: () => navigate("/inventory") },
    { label: t("myHeroes", language), icon: <FaMagic size={28} />, action: () => navigate("/my-heroes") },
    { label: t("friends", language), icon: <FaUserFriends size={28} />, action: () => navigate("/friends") },
    { label: t("guilds", language), icon: <FaUsers size={28} /> },
    { label: t("quests", language), icon: <FaBookOpen size={28} />, action: () => navigate("/battle") },
    { label: t("battle", language), icon: <FaCrosshairs size={28} /> },
    { label: t("shop", language), icon: <FaBoxOpen size={28} />, action: () => navigate("/shop") },
  ];
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white">
        {t("loadingProfile", language)}...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6 relative">

      {/* Panneau de paramètres modale */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
          <div className="relative z-50">
            <SettingsPanel />
          </div>
        </div>
      )}

      {/*  Boîte de réception modale */}
      {showMailbox && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="absolute inset-0" onClick={() => setShowMailbox(false)} />
          <div className="relative z-50">
            <MailboxOverlay onClose={() => setShowMailbox(false)} />
          </div>
        </div>
      )}

      {/* Modal de résultats de recherche */}
      {showSearchResults && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="absolute inset-0" onClick={resetSearch} />
          <div className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative z-50">
            <h2 className="text-2xl font-bold mb-4">{t("searchResults", language)}</h2>
            {searchResults.length > 0 ? (
              <ul className="space-y-4">
                {searchResults.map((player) => (
                  <li
                    key={player.id}
                    className="p-4 bg-purple-50 dark:bg-[#3a3660] rounded-lg hover:bg-purple-100 dark:hover:bg-[#4a4680] cursor-pointer transition"
                    onClick={() => navigateToProfile(player.id)}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={player.avatar || "/epic7-Hero/sprite-hero/unknown.png"}
                        alt={player.username}
                        className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                        }}
                      />
                      <div>
                        <p className="font-bold">{player.username}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{t("level", language)} {player.level}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-4">{t("noPlayerWithName", language) || `No player with name "${searchTerm}" found`}</p>
            )}
            <button
              onClick={resetSearch}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              {t("close", language)}
            </button>
          </div>
        </div>
      )}

      {/*  Carte de profil flottante */}
      {showProfile && <ProfileCard user={user} onClose={() => setShowProfile(false)} />}

      {/*  Mini carte profil et barre de recherche */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Barre de recherche */}
        <form
          onSubmit={handleSearchSubmit}
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
                        src={player.avatar || "/epic7-Hero/sprite-hero/unknown.png"}
                        alt=""
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
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

        {/* Profile buttons */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => setShowMailbox(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-10"
            aria-label="Ouvrir la boîte de réception"
          >
            <span className="text-2xl">📬</span>
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="w-full max-w-xs p-4 bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl hover:ring-2 ring-purple-400 transition text-left"
          >
            <article className="flex items-center gap-4">
              <img src="/epic7-Hero/sprite-hero/mavuika.png" alt="avatar" className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-600 object-cover shadow"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                }}
              />
              <div>
                <h2 className="text-xl font-bold">{user.username}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t("level", language)} {user.level}</p>
              </div>
            </article>

            <aside className="mt-4 grid grid-cols-3 gap-2 text-sm text-center">
              <p className="bg-purple-50 dark:bg-[#3a3660] p-2 rounded-lg">💰 {user.gold}</p>
              <p className="bg-purple-50 dark:bg-[#3a3660] p-2 rounded-lg">💎 {user.diamonds}</p>
              <p className="bg-purple-50 dark:bg-[#3a3660] p-2 rounded-lg">⚡ {user.energy}</p>
            </aside>
          </button>
        </div>
      </header>

      {/*  Titre d'accueil */}
      <section className="text-center mb-10">
        <h1 className="text-3xl font-bold">
          {t("welcome", language)}, <span className="text-purple-500 dark:text-purple-300">{user.username}</span>
        </h1>
      </section>

      {/*  Menu principal */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-6" aria-label="Main Navigation">
        {menuItems.map((item, index) => (
          <MenuTile key={index} label={item.label} icon={item.icon} onClick={item.action}
            index={index}
          />
        ))}
      </section>

      {/*  Déconnexion */}
      <footer className="mt-12 text-center">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
        >
          {t("logout", language)}
        </button>
      </footer>
      {/* Bouton flottant pour ouvrir les paramètres */}
      <button onClick={() => setShowSettings(true)} className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-50" aria-label="Ouvrir les paramètres">
        <span className="text-2xl">⚙️</span>
      </button>
    </main>
  );
};

export default Dashboard;
