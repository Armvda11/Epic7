// src/pages/DashboardNew.jsx
import React, { useEffect, useState, useRef } from "react";
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

import { FaUserFriends, FaUsers, FaMagic, FaCrosshairs, FaBookOpen, FaBoxOpen, FaStar, FaComments, FaGlobeAmericas, FaCog } from "react-icons/fa";
import { getAllHeroes } from "../services/summonService";

const Dashboard = () => {
  const navigate = useNavigate();
  const settings = useSettings();

  const { language, t, theme, toggleTheme } = settings;
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);

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

  // Navigation Items - Style Gaming Organisé
  const mainMenuItems = [
    { label: t("inventory", language), icon: <FaBoxOpen size={20} />, action: () => navigate("/inventory"), color: "purple" },
    { label: t("myHeroes", language), icon: <FaMagic size={20} />, action: () => navigate("/my-heroes"), color: "blue" },
    { label: t("friends", language), icon: <FaUserFriends size={20} />, action: () => navigate("/friends"), color: "green" },
    { label: t("guilds", language), icon: <FaUsers size={20} />, action: () => navigate("/guilds"), color: "orange" },
    { label: t("battle", language), icon: <FaCrosshairs size={20} />, action: () => navigate("/rta"), color: "red" },
    { label: t("shop", language), icon: <FaBoxOpen size={20} />, action: () => navigate("/shop"), color: "yellow" },
    { label: t("summon", language), icon: <FaStar size={20} />, action: () => navigate("/summons"), color: "pink" },
    { label: t("quests", language), icon: <FaBookOpen size={20} />, action: () => navigate("/battle"), color: "indigo" },
  ];

  //  Chargement des infos utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile();
        if (data === null) {
          console.log("User not authenticated, redirecting to login page");
          navigate("/");
          return;
        }
        setUser(data);
      } catch (error) {
        console.error("Failed to load user profile:", error);
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
      setCurrentHeroIndex(0);
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
          findNextAvailableHero(nextIndex, attempts + 1);
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

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

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
    if (searchResults.length === 0) return;
    if (searchResults.length === 1) {
      navigate(`/profile/${searchResults[0].id}`);
      resetSearch();
    } else {
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

      {/* Header moderne et élégant */}
      <header className="relative z-10 p-6">
        <div className="flex justify-between items-center">
          {/* Section Profil - Gauche */}
          <div 
            className={`backdrop-blur-xl border rounded-2xl p-4 shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:shadow-purple-500/20' 
                : 'bg-gradient-to-br from-white/60 to-white/40 border-white/40 hover:shadow-purple-300/30'
            }`}
            onClick={() => setShowProfile(true)}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={heroImg("mavuika")} 
                  alt="avatar" 
                  className="w-14 h-14 rounded-full object-cover ring-4 ring-gradient-to-r from-purple-400 to-blue-400 shadow-lg transition-all duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = heroImgUnknown;
                  }}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
              </div>
              <div className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                <h2 className={`text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                  theme === 'dark' ? 'from-white to-purple-200' : 'from-gray-800 to-purple-600'
                }`}>{user.username}</h2>
                <p className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                }`}>{t("level", language)} {user.level}</p>
              </div>
            </div>
          </div>

          {/* Titre central */}
          <div className="text-center">
            <h1 className={`text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2 ${
              theme === 'dark' 
                ? 'from-purple-400 via-pink-400 to-blue-400' 
                : 'from-purple-600 via-pink-600 to-blue-600'
            }`}>
              EPIC SEVEN
            </h1>
            <p className={`text-sm font-medium ${
              theme === 'dark' ? 'text-white/80' : 'text-gray-700'
            }`}>
              {t("welcome", language)}, {user.username}
            </p>
          </div>

          {/* Actions et ressources - Droite */}
          <div className="flex flex-col gap-4 items-end">
            {/* Barre de ressources */}
            <div className={`backdrop-blur-xl border rounded-xl p-3 shadow-xl ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-black/40 to-black/60 border-white/20' 
                : 'bg-gradient-to-r from-white/50 to-white/70 border-white/50'
            }`}>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">💰</span>
                  </div>
                  <span className={`font-bold text-sm ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{user.gold?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">💎</span>
                  </div>
                  <span className={`font-bold text-sm ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{user.diamonds?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">⚡</span>
                  </div>
                  <span className={`font-bold text-sm ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{user.energy}</span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-110 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:shadow-yellow-500/30 text-white' 
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-indigo-500/30 text-white'
                }`}
                title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => setShowMailbox(true)}
                className={`p-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-110 relative ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-orange-500/30 text-white' 
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-orange-400/40 text-white'
                }`}
              >
                📬
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white text-xs"></div>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-110 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:shadow-slate-500/30 text-white' 
                    : 'bg-gradient-to-r from-slate-500 to-slate-600 hover:shadow-slate-400/40 text-white'
                }`}
              >
                <FaCog size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="flex justify-center mt-6">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={t("searchPlayer", language)}
              className={`w-80 pl-12 pr-4 py-3 backdrop-blur-xl border rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
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
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-400 rounded-full border-t-transparent"></div>
              </div>
            )}
          </form>
        </div>
      </header>

      {/* Hero Showcase Central */}
      <section className="relative z-10 flex justify-center mb-8">
        {videoSource && (
          <div className={`relative w-[320px] h-[220px] rounded-xl overflow-hidden shadow-2xl border-2 transition-all duration-300 hover:scale-105 ${
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
            <div className="absolute bottom-3 left-3 text-white">
              <div className="text-sm font-bold drop-shadow-lg">
                {allHeroes[currentHeroIndex]?.name || "Héros en vedette"}
              </div>
              <div className="text-xs opacity-80 drop-shadow-md">
                {allHeroes[currentHeroIndex]?.element} • {allHeroes[currentHeroIndex]?.rarity}
              </div>
            </div>
            <div className="absolute top-3 right-3">
              <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-medium">LIVE</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Navigation principale - Grille gaming moderne */}
      <section className="relative z-10 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-6">
            {mainMenuItems.map((item, index) => {
              const colors = {
                purple: theme === 'dark' ? 'from-purple-600 to-purple-800' : 'from-purple-500 to-purple-700',
                blue: theme === 'dark' ? 'from-blue-600 to-blue-800' : 'from-blue-500 to-blue-700',
                green: theme === 'dark' ? 'from-green-600 to-green-800' : 'from-green-500 to-green-700',
                orange: theme === 'dark' ? 'from-orange-600 to-orange-800' : 'from-orange-500 to-orange-700',
                red: theme === 'dark' ? 'from-red-600 to-red-800' : 'from-red-500 to-red-700',
                yellow: theme === 'dark' ? 'from-yellow-600 to-yellow-800' : 'from-yellow-500 to-yellow-700',
                pink: theme === 'dark' ? 'from-pink-600 to-pink-800' : 'from-pink-500 to-pink-700',
                indigo: theme === 'dark' ? 'from-indigo-600 to-indigo-800' : 'from-indigo-500 to-indigo-700',
              };

              return (
                <motion.div
                  key={index}
                  className="group"
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    onClick={item.action}
                    className={`relative w-full h-32 rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-500 group-hover:shadow-2xl overflow-hidden ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:border-white/40' 
                        : 'bg-gradient-to-br from-white/60 to-white/40 border-white/40 hover:border-white/60'
                    }`}
                  >
                    {/* Effet brillant */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 shimmer-effect" />
                    
                    {/* Contenu du bouton */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
                      <div className={`flex items-center justify-center w-14 h-14 rounded-xl shadow-lg transition-all duration-300 mb-3 group-hover:scale-110 bg-gradient-to-br ${colors[item.color]} text-white`}>
                        {item.icon}
                      </div>
                      <span className={`font-bold text-sm text-center leading-tight transition-colors duration-300 ${
                        theme === 'dark' ? 'text-white group-hover:text-purple-200' : 'text-gray-800 group-hover:text-purple-700'
                      }`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Indicateur de hover */}
                    <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 w-0 h-1 rounded-full transition-all duration-300 group-hover:w-16 bg-gradient-to-r ${colors[item.color]}`} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer avec bouton de déconnexion */}
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

      {/* Overlays */}
      <AnimatePresence>
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
      </AnimatePresence>
    </main>
  );
};

export default Dashboard;
