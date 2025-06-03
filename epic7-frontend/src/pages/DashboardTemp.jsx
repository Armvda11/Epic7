// src/pages/Dashboard.jsx
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

  // Navigation Items - Style Gaming Moderne et Beau
  const mainMenuItems = [
    { 
      label: t("inventory", language), 
      icon: <FaBoxOpen size={24} />, 
      action: () => navigate("/inventory"), 
      gradient: "from-emerald-500 to-emerald-700",
      shadowColor: "emerald",
      bgPattern: "emerald"
    },
    { 
      label: t("myHeroes", language), 
      icon: <FaMagic size={24} />, 
      action: () => navigate("/my-heroes"), 
      gradient: "from-purple-500 to-purple-700",
      shadowColor: "purple",
      bgPattern: "purple"
    },
    { 
      label: t("friends", language), 
      icon: <FaUserFriends size={24} />, 
      action: () => navigate("/friends"), 
      gradient: "from-blue-500 to-blue-700",
      shadowColor: "blue",
      bgPattern: "blue"
    },
    { 
      label: t("guilds", language), 
      icon: <FaUsers size={24} />, 
      action: () => navigate("/guilds"), 
      gradient: "from-orange-500 to-orange-700",
      shadowColor: "orange",
      bgPattern: "orange"
    },
    { 
      label: t("battle", language), 
      icon: <FaCrosshairs size={24} />, 
      action: () => navigate("/rta"), 
      gradient: "from-red-500 to-red-700",
      shadowColor: "red",
      bgPattern: "red"
    },
    { 
      label: t("shop", language), 
      icon: <FaBoxOpen size={24} />, 
      action: () => navigate("/shop"), 
      gradient: "from-yellow-500 to-yellow-700",
      shadowColor: "yellow",
      bgPattern: "yellow"
    },
    { 
      label: t("summon", language), 
      icon: <FaStar size={24} />, 
      action: () => navigate("/summons"), 
      gradient: "from-pink-500 to-pink-700",
      shadowColor: "pink",
      bgPattern: "pink"
    },
    { 
      label: t("quests", language), 
      icon: <FaBookOpen size={24} />, 
      action: () => navigate("/battle"), 
      gradient: "from-indigo-500 to-indigo-700",
      shadowColor: "indigo",
      bgPattern: "indigo"
    },
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
      <main className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white' 
          : 'bg-gradient-to-br from-purple-50 to-indigo-100 text-gray-900'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-lg font-semibold">{t("loadingProfile", language)}...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`relative min-h-screen overflow-hidden transition-all duration-700 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Background artistique dynamique */}
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-700 ${
          theme === 'dark' ? 'opacity-25' : 'opacity-15'
        }`}
        style={{ 
          backgroundImage: "url('splashArt.png')",
          filter: theme === 'dark' ? 'brightness(0.7) contrast(1.2)' : 'brightness(1.1) contrast(0.9)'
        }}
      />
      
      {/* Overlay gradiant sophistiqué */}
      <div className={`absolute inset-0 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-black/40 via-purple-900/20 to-black/60' 
          : 'bg-gradient-to-br from-white/50 via-purple-100/30 to-white/40'
      }`} />
      
      {/* Particules flottantes animées */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              theme === 'dark' 
                ? 'bg-gradient-to-r from-purple-400/60 to-blue-400/60' 
                : 'bg-gradient-to-r from-purple-300/40 to-pink-300/40'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header Ultra-Moderne */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            {/* Section Profil Élégante */}
            <motion.div 
              className={`backdrop-blur-2xl border rounded-2xl p-5 shadow-2xl cursor-pointer transition-all duration-500 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:shadow-purple-500/30' 
                  : 'bg-gradient-to-br from-white/70 to-white/50 border-white/50 hover:shadow-purple-300/40'
              }`}
              onClick={() => setShowProfile(true)}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={heroImg("mavuika")} 
                    alt="avatar" 
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-purple-400/60 shadow-xl transition-all duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = heroImgUnknown;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg">
                    <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                  </div>
                </div>
                <div className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                  <h2 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                    theme === 'dark' ? 'from-white via-purple-200 to-blue-200' : 'from-gray-800 via-purple-600 to-blue-600'
                  }`}>{user.username}</h2>
                  <p className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                  }`}>{t("level", language)} {user.level}</p>
                  <p className={`text-xs opacity-75 ${
                    theme === 'dark' ? 'text-blue-200' : 'text-blue-600'
                  }`}>Cliquez pour voir le profil</p>
                </div>
              </div>
            </motion.div>

            {/* Titre Central Majestueux */}
            <div className="text-center">
              <motion.h1 
                className={`text-6xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2 ${
                  theme === 'dark' 
                    ? 'from-purple-400 via-pink-400 to-blue-400' 
                    : 'from-purple-600 via-pink-600 to-blue-600'
                }`}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 200%'
                }}
              >
                EPIC SEVEN
              </motion.h1>
              <motion.p 
                className={`text-lg font-medium ${
                  theme === 'dark' ? 'text-white/90' : 'text-gray-700'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {t("welcome", language)}, <span className="font-bold text-purple-500">{user.username}</span>
              </motion.p>
            </div>

            {/* Section Ressources et Actions */}
            <div className="flex flex-col gap-4 items-end">
              {/* Barre de ressources premium */}
              <motion.div 
                className={`backdrop-blur-2xl border rounded-xl p-4 shadow-xl ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-black/50 to-black/70 border-white/20' 
                    : 'bg-gradient-to-r from-white/60 to-white/80 border-white/60'
                }`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex gap-6">
                  {[
                    { icon: "💰", value: user.gold, color: "from-yellow-400 to-yellow-600" },
                    { icon: "💎", value: user.diamonds, color: "from-blue-400 to-blue-600" },
                    { icon: "⚡", value: user.energy, color: "from-green-400 to-green-600" }
                  ].map((resource, index) => (
                    <motion.div 
                      key={index}
                      className="flex items-center gap-3 group"
                      whileHover={{ scale: 1.1 }}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${resource.color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                        <span className="text-lg">{resource.icon}</span>
                      </div>
                      <span className={`font-bold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>{resource.value?.toLocaleString()}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Actions rapides stylées */}
              <div className="flex gap-3">
                {[
                  { 
                    icon: theme === 'dark' ? '☀️' : '🌙', 
                    action: toggleTheme, 
                    gradient: theme === 'dark' ? 'from-yellow-500 to-yellow-600' : 'from-indigo-600 to-indigo-700',
                    title: theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'
                  },
                  { 
                    icon: '📬', 
                    action: () => setShowMailbox(true), 
                    gradient: 'from-orange-500 to-orange-600',
                    title: 'Messages',
                    badge: true
                  },
                  { 
                    icon: <FaCog size={18} />, 
                    action: () => setShowSettings(true), 
                    gradient: 'from-slate-500 to-slate-600',
                    title: 'Paramètres'
                  }
                ].map((btn, index) => (
                  <motion.button
                    key={index}
                    onClick={btn.action}
                    className={`relative p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 bg-gradient-to-r ${btn.gradient} text-white hover:shadow-xl`}
                    title={btn.title}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {btn.icon}
                    {btn.badge && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Barre de recherche sophistiquée */}
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={t("searchPlayer", language)}
                className={`w-96 pl-14 pr-12 py-4 backdrop-blur-2xl border rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-transparent ${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/20 text-white placeholder-white/60' 
                    : 'bg-white/70 border-white/50 text-gray-800 placeholder-gray-500'
                }`}
              />
              <div className={`absolute left-5 top-1/2 transform -translate-y-1/2 text-xl ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-500'
              }`}>
                🔍
              </div>
              {isSearching && (
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-purple-400 rounded-full border-t-transparent"></div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </header>

      {/* Hero Showcase Époustouflant */}
      <section className="relative z-10 flex justify-center mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 100 }}
        >
          {videoSource && (
            <div className={`relative w-[380px] h-[260px] rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-500 hover:scale-105 ${
              theme === 'dark' 
                ? 'border-purple-400/60 shadow-purple-500/40' 
                : 'border-purple-300/60 shadow-purple-300/50'
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-lg font-bold drop-shadow-lg mb-1">
                  {allHeroes[currentHeroIndex]?.name || "Héros en vedette"}
                </div>
                <div className="text-sm opacity-90 drop-shadow-md">
                  {allHeroes[currentHeroIndex]?.element} • {allHeroes[currentHeroIndex]?.rarity}
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-semibold">EN DIRECT</span>
                </div>
              </div>
              {/* Effet de brillance */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Navigation Gaming Ultra-Moderne */}
      <section className="relative z-10 px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, staggerChildren: 0.1 }}
          >
            {mainMenuItems.map((item, index) => (
              <motion.div
                key={index}
                className="group relative"
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ 
                  delay: 1.2 + index * 0.1, 
                  type: "spring", 
                  stiffness: 100,
                  damping: 15 
                }}
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: 5,
                  z: 50
                }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={item.action}
                  className={`relative w-full h-40 rounded-3xl backdrop-blur-2xl border-2 shadow-2xl transition-all duration-500 group-hover:shadow-3xl overflow-hidden ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:border-white/40' 
                      : 'bg-gradient-to-br from-white/80 to-white/60 border-white/60 hover:border-white/80'
                  } ${item.shadowColor === 'emerald' && 'hover:shadow-emerald-400/40'} ${item.shadowColor === 'purple' && 'hover:shadow-purple-400/40'} ${item.shadowColor === 'blue' && 'hover:shadow-blue-400/40'} ${item.shadowColor === 'orange' && 'hover:shadow-orange-400/40'} ${item.shadowColor === 'red' && 'hover:shadow-red-400/40'} ${item.shadowColor === 'yellow' && 'hover:shadow-yellow-400/40'} ${item.shadowColor === 'pink' && 'hover:shadow-pink-400/40'} ${item.shadowColor === 'indigo' && 'hover:shadow-indigo-400/40'}`}
                >
                  {/* Effet magique de background */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-gradient-to-br ${item.gradient}/10`} />
                  
                  {/* Effet shimmer ultra */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 group-hover:animate-pulse" />
                  
                  {/* Contenu du bouton */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
                    <motion.div 
                      className={`flex items-center justify-center w-16 h-16 rounded-2xl shadow-xl transition-all duration-500 mb-4 bg-gradient-to-br ${item.gradient} text-white group-hover:scale-125 group-hover:rotate-12`}
                      whileHover={{ 
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                        scale: 1.1
                      }}
                    >
                      {item.icon}
                    </motion.div>
                    <span className={`font-bold text-sm text-center leading-tight transition-all duration-300 ${
                      theme === 'dark' ? 'text-white group-hover:text-purple-200' : 'text-gray-800 group-hover:text-purple-700'
                    }`}>
                      {item.label}
                    </span>
                  </div>

                  {/* Indicateur de hover magique */}
                  <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-2 rounded-full transition-all duration-500 group-hover:w-20 bg-gradient-to-r ${item.gradient} shadow-lg`} />
                  
                  {/* Particles d'effet */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${item.gradient} animate-ping`}
                        style={{
                          left: `${20 + Math.random() * 60}%`,
                          top: `${20 + Math.random() * 60}%`,
                          animationDelay: `${Math.random() * 2}s`,
                        }}
                      />
                    ))}
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer élégant */}
      <footer className="absolute bottom-6 left-6 z-10">
        <motion.button 
          onClick={handleLogout} 
          className={`flex items-center gap-3 font-semibold py-4 px-8 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r ${
            theme === 'dark' 
              ? 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:shadow-red-500/40' 
              : 'from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white hover:shadow-red-400/50'
          }`}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </motion.button>
      </footer>

      {/* Overlays avec animations premium */}
      <AnimatePresence>
        {showProfile && (
          <motion.div 
            className={`fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center ${
              theme === 'dark' ? 'bg-black/70' : 'bg-black/50'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setShowProfile(false)} />
            <motion.div 
              className="relative z-50"
              initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateX: 15 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ProfileCard user={user} onClose={() => setShowProfile(false)} />
            </motion.div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            className={`fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center ${
              theme === 'dark' ? 'bg-black/70' : 'bg-black/50'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setShowSettings(false)} />
            <motion.div 
              className="relative z-50"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <SettingsPanel />
            </motion.div>
          </motion.div>
        )}

        {showMailbox && (
          <motion.div 
            className={`fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center ${
              theme === 'dark' ? 'bg-black/70' : 'bg-black/50'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" onClick={() => setShowMailbox(false)} />
            <motion.div 
              className="relative z-50"
              initial={{ scale: 0.8, opacity: 0, x: 100 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.8, opacity: 0, x: -100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
