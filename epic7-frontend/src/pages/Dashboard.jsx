// src/pages/Dashboard.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { logout } from "../services/authService";
import { fetchUserProfile, searchUsers } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import MenuTile from "../components/MenuTile";
import ProfileCard from "../components/ProfileCard";
import SettingsPanel from "../components/settings/SettingsPanel";
import MailboxOverlay from "../components/MailboxOverlay/MailboxOverlay";
import { heroImg, heroImgUnknown } from "../components/heroUtils";
import "../components/DashboardAnimations.css";

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

  const { language, t, theme, toggleTheme } = settings;
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
    { label: t("rtaRanking", language) || "Classement RTA", icon: <FaGlobeAmericas size={28} />, action: () => navigate("/rta-leaderboard") },
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
    <main className={`relative min-h-screen overflow-hidden transition-all duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Background avec overlay dynamique */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-fixed animate-backgroundZoom transition-opacity duration-500 ${
          theme === 'dark' ? 'opacity-20' : 'opacity-10'
        }`}
        style={{ backgroundImage: "url('splashArt.png')" }}
      />
      <div className={`absolute inset-0 ${
        theme === 'dark' 
          ? 'bg-gradient-to-b from-black/20 via-transparent to-black/40' 
          : 'bg-gradient-to-b from-white/30 via-transparent to-white/20'
      }`} />
      
      {/* Particules d'ambiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full opacity-60 ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-purple-400 to-blue-400' 
                : 'bg-gradient-to-r from-purple-300 to-pink-300'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <header className="relative z-10 flex justify-between items-start p-6">
        {/* Section Profil - Gauche */}
        <div className="flex flex-col gap-4">
          {/* Carte de profil améliorée */}
          <div className={`backdrop-blur-xl border rounded-2xl p-6 shadow-2xl transition-all duration-300 group ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:shadow-purple-500/20' 
              : 'bg-gradient-to-br from-white/60 to-white/40 border-white/40 hover:shadow-purple-300/30'
          }`}>
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-4 text-left w-full group-hover:scale-105 transition-transform duration-300"
            >
              <div className="relative">
                <img 
                  src={heroImg("mavuika")} 
                  alt="avatar" 
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-gradient-to-r from-purple-400 to-blue-400 shadow-lg group-hover:ring-purple-300 transition-all duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = heroImgUnknown;
                  }}
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              </div>
              <div className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                <h2 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                  theme === 'dark' ? 'from-white to-purple-200' : 'from-gray-800 to-purple-600'
                }`}>{user.username}</h2>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                }`}>{t("level", language)} {user.level}</p>
                <button
                  className={`mt-1 text-xs transition-colors duration-200 ${
                    theme === 'dark' 
                      ? 'text-purple-400 hover:text-purple-300' 
                      : 'text-purple-500 hover:text-purple-700'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${user.id}`);
                  }}
                >
                  {t("viewProfile", language) || "View Profile"}
                </button>
              </div>
            </button>
          </div>

          {/* Actions rapides */}
          <div className="flex gap-3">
            {/* Bouton de basculement de thème */}
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white hover:shadow-yellow-500/30' 
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white hover:shadow-indigo-500/30'
              }`}
              title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => navigate("/global-chat")}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white hover:shadow-purple-500/30' 
                  : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white hover:shadow-purple-400/40'
              }`}
              title={t("globalChat", language) || "Chat Global"}
            >
              <FaComments size={20} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white hover:shadow-slate-500/30' 
                  : 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-400 hover:to-slate-500 text-white hover:shadow-slate-400/40'
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Section centrale - Hero showcase déplacé */}
        <div className="flex flex-col items-center">
          {/* Titre du jeu avec effet néon */}
          <div className="mb-6 text-center">
            <h1 className={`text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2 ${
              theme === 'dark' 
                ? 'from-purple-400 via-pink-400 to-blue-400 animate-pulse' 
                : 'from-purple-600 via-pink-600 to-blue-600'
            }`}>
              EPIC SEVEN
            </h1>
            <p className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white/80' : 'text-gray-700'
            }`}>
              {t("welcome", language)}, {user.username}
            </p>
          </div>

          {/* Animation de héros réduite */}
          <div className="relative hero-float">
            {videoSource && (
              <div className={`relative w-[280px] h-[200px] rounded-xl overflow-hidden shadow-xl border-2 transition-all duration-300 hover:scale-105 hero-glow ${
                theme === 'dark' 
                  ? 'border-purple-400 shadow-purple-500/30' 
                  : 'border-purple-300 shadow-purple-300/40'
              }`}>
                <video
                  key={`${videoSource}-${Date.now()}`} 
                  autoPlay 
                  muted
                  className="w-full h-full object-cover"
                  ref={videoRef}
                >
                  <source src={videoSource} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 text-white">
                  <div className="text-sm font-bold drop-shadow-lg">
                    {allHeroes[currentHeroIndex]?.name || "Héros en vedette"}
                  </div>
                  <div className="text-xs opacity-80 drop-shadow-md">
                    {allHeroes[currentHeroIndex]?.element} • {allHeroes[currentHeroIndex]?.rarity}
                  </div>
                </div>
                {/* Indicateur de lecture */}
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-2 py-1 pulse-glow">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-medium">LIVE</span>
                  </div>
                </div>
                {/* Effet shimmer */}
                <div className="absolute inset-0 shimmer-effect opacity-30 pointer-events-none"></div>
              </div>
            )}
          </div>
        </div>

        {/* Section Ressources - Droite */}
        <div className="flex flex-col gap-4 items-end">
          {/* Barre de ressources améliorée */}
          <div className={`backdrop-blur-xl border rounded-2xl p-4 shadow-2xl ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-black/40 to-black/60 border-white/20' 
              : 'bg-gradient-to-r from-white/50 to-white/70 border-white/50'
          }`}>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm">💰</span>
                </div>
                <span className={`font-bold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{user.gold?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm">💎</span>
                </div>
                <span className={`font-bold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{user.diamonds?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm">⚡</span>
                </div>
                <span className={`font-bold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{user.energy}</span>
              </div>
            </div>
          </div>

          {/* Actions secondaires */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowMailbox(true)}
              className={`p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 relative ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white hover:shadow-orange-500/30' 
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white hover:shadow-orange-400/40'
              }`}
            >
              📬
              {/* Badge de notification */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-xs flex items-center justify-center animate-pulse">
                3
              </div>
            </button>

            {/* Barre de recherche moderne */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={t("searchPlayer", language)}
                className={`w-64 pl-12 pr-4 py-3 backdrop-blur-xl border rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/20 text-white placeholder-white/60' 
                    : 'bg-white/60 border-white/40 text-gray-800 placeholder-gray-500'
                }`}
              />
              <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-500'
              }`}>
                🔍
              </div>

              {/* Résultats de recherche avec glassmorphism */}
              {searchTerm.length > 1 && !showSearchResults && (
                <div className={`absolute z-50 w-full mt-2 backdrop-blur-xl border rounded-xl shadow-2xl max-h-60 overflow-y-auto ${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/80 border-white/50'
                }`}>
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.slice(0, 5).map((player) => (
                        <div
                          key={player.id}
                          onClick={() => navigateToProfile(player.id)}
                          className={`p-3 cursor-pointer flex items-center gap-3 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl ${
                            theme === 'dark' 
                              ? 'hover:bg-white/20' 
                              : 'hover:bg-white/60'
                          }`}
                        >
                          <img
                            src={heroImg("schniel") || heroImgUnknown}
                            alt=""
                            className="w-8 h-8 rounded-full ring-2 ring-white/30"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = heroImgUnknown;
                            }}
                          />
                          <span className={`font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>{player.username}</span>
                        </div>
                      ))}
                      {searchResults.length > 5 && (
                        <div className={`p-2 text-center text-sm ${
                          theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                        }`}>
                          {searchResults.length - 5} {t("moreResults", language)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`p-3 ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                    }`}>
                      {!isSearching && (t("noPlayerWithName", language) || `No player with name "${searchTerm}" found`)}
                    </div>
                  )}
                </div>
              )}

              {isSearching && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-purple-400 rounded-full border-t-transparent"></div>
                </div>
              )}
            </form>
          </div>
        </div>
      </header>

      {/* Navigation principale avec design complètement repensé */}
      <section className="relative z-10 px-8 mt-8">
        {/* Grille de navigation moderne */}
        <div className="max-w-6xl mx-auto">
          {/* Ligne principale d'actions */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {/* Menu items reorganisés */}
            {[...leftMenuItems, ...rightMenuItems].map((item, index) => (
              <motion.div
                key={index}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <button
                  onClick={item.action}
                  className={`w-full flex flex-col items-center gap-3 p-4 backdrop-blur-xl border rounded-2xl shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:shadow-2xl hover:shadow-purple-500/20 hover:bg-gradient-to-br hover:from-purple-600/20 hover:to-purple-500/10 text-white' 
                      : 'bg-gradient-to-br from-white/60 to-white/40 border-white/40 hover:shadow-2xl hover:shadow-purple-300/30 hover:bg-gradient-to-br hover:from-purple-200/40 hover:to-purple-100/20 text-gray-800'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-lg transition-all duration-300 ${
                    index < leftMenuItems.length 
                      ? 'bg-gradient-to-br from-purple-500 to-purple-700 group-hover:shadow-purple-500/50' 
                      : 'bg-gradient-to-br from-blue-500 to-blue-700 group-hover:shadow-blue-500/50'
                  } text-white`}>
                    {item.icon}
                  </div>
                  <span className="font-semibold text-sm text-center leading-tight">{item.label}</span>
                  <div className={`w-0 h-0.5 transition-all duration-300 rounded-full ${
                    index < leftMenuItems.length 
                      ? 'group-hover:w-full bg-purple-500' 
                      : 'group-hover:w-full bg-blue-500'
                  }`} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer avec bouton de déconnexion stylisé */}
      <footer className="absolute bottom-6 left-6 z-10">
        <button 
          onClick={handleLogout} 
          className={`flex items-center gap-2 font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:shadow-red-500/30' 
              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white hover:shadow-red-400/40'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </footer>

      {/* Overlays améliorés avec thèmes */}
      {showProfile && (
        <motion.div 
          className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={() => setShowProfile(false)} />
          <motion.div 
            className="relative z-50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <ProfileCard user={user} onClose={() => setShowProfile(false)} />
          </motion.div>
        </motion.div>
      )}

      {showSettings && (
        <motion.div 
          className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
          <motion.div 
            className="relative z-50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <SettingsPanel />
          </motion.div>
        </motion.div>
      )}

      {showMailbox && (
        <motion.div 
          className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={() => setShowMailbox(false)} />
          <motion.div 
            className="relative z-50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <MailboxOverlay onClose={() => setShowMailbox(false)} />
          </motion.div>
        </motion.div>
      )}
    </main>
  );
};

export default Dashboard;
