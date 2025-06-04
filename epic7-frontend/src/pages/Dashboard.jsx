// Epic7 Ultra-Modern Gaming Dashboard
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { logout } from "../services/authService";
import { fetchUserProfile, searchUsers } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import SettingsPanel from "../components/settings/SettingsPanel";
import MailboxOverlay from "../components/MailboxOverlay/MailboxOverlay";
import { heroImg, heroImgUnknown } from "../components/heroUtils";
import "../components/DashboardAnimations.css";

import { 
  FaUserFriends, 
  FaUsers, 
  FaMagic, 
  FaCrosshairs, 
  FaBookOpen, 
  FaBoxOpen, 
  FaStar, 
  FaComments, 
  FaGlobeAmericas, 
  FaCog,
  FaSearch,
  FaMoon,
  FaSun,
  FaUser,
  FaEnvelope,
  FaSignOutAlt,
  FaCoins,
  FaGem,
  FaBolt,
  FaPlay,
  FaStarOfLife
} from "react-icons/fa";

import { getAllHeroes } from "../services/summonService";

const Dashboard = () => {
  const navigate = useNavigate();
  const settings = useSettings();
  const { language, t, theme, toggleTheme } = settings;
  
  // États principaux
  const [user, setUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);

  // États pour la recherche
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  // États pour l'animation des héros
  const [allHeroes, setAllHeroes] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [videoSource, setVideoSource] = useState("");
  const videoRef = useRef(null);

  // Navigation items avec style gaming moderne
  const navigationItems = [
    { 
      id: 'inventory',
      label: t("inventory", language) || "Inventaire", 
      icon: <FaBoxOpen size={28} />, 
      action: () => navigate("/inventory"), 
      gradient: "from-emerald-500 via-emerald-600 to-emerald-700",
      shadowColor: "shadow-emerald-500/40",
      hoverScale: 1.05,
      description: "Gérez vos objets"
    },
    { 
      id: 'heroes',
      label: t("myHeroes", language) || "Mes Héros", 
      icon: <FaMagic size={28} />, 
      action: () => navigate("/my-heroes"), 
      gradient: "from-purple-500 via-purple-600 to-purple-700",
      shadowColor: "shadow-purple-500/40",
      hoverScale: 1.05,
      description: "Collection de héros"
    },
    { 
      id: 'friends',
      label: t("friends", language) || "Amis", 
      icon: <FaUserFriends size={28} />, 
      action: () => navigate("/friends"), 
      gradient: "from-blue-500 via-blue-600 to-blue-700",
      shadowColor: "shadow-blue-500/40",
      hoverScale: 1.05,
      description: "Liste d'amis"
    },
    { 
      id: 'guilds',
      label: t("guilds", language) || "Guildes", 
      icon: <FaUsers size={28} />, 
      action: () => navigate("/guilds"), 
      gradient: "from-orange-500 via-orange-600 to-orange-700",
      shadowColor: "shadow-orange-500/40",
      hoverScale: 1.05,
      description: "Rejoindre une guilde"
    },
    { 
      id: 'battle',
      label: t("battle", language) || "Combat", 
      icon: <FaCrosshairs size={28} />, 
      action: () => navigate("/rta"), 
      gradient: "from-red-500 via-red-600 to-red-700",
      shadowColor: "shadow-red-500/40",
      hoverScale: 1.05,
      description: "Arena PvP"
    },
    { 
      id: 'shop',
      label: t("shop", language) || "Boutique", 
      icon: <FaBoxOpen size={28} />, 
      action: () => navigate("/shop"), 
      gradient: "from-yellow-500 via-yellow-600 to-yellow-700",
      shadowColor: "shadow-yellow-500/40",
      hoverScale: 1.05,
      description: "Acheter des objets"
    },
    { 
      id: 'summon',
      label: t("summon", language) || "Invocation", 
      icon: <FaStar size={28} />, 
      action: () => navigate("/summons"), 
      gradient: "from-pink-500 via-pink-600 to-pink-700",
      shadowColor: "shadow-pink-500/40",
      hoverScale: 1.05,
      description: "Invoquer des héros"
    },
    { 
      id: 'quests',
      label: t("quests", language) || "Quêtes", 
      icon: <FaBookOpen size={28} />, 
      action: () => navigate("/battle"), 
      gradient: "from-indigo-500 via-indigo-600 to-indigo-700",
      shadowColor: "shadow-indigo-500/40",
      hoverScale: 1.05,
      description: "Aventures épiques"
    },
  ];

  // Chargement du profil utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile();
        if (data === null) {
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

  // Chargement des héros
  useEffect(() => {
    const fetchHeroes = async () => {
      try {
        const heroes = await getAllHeroes();
        setAllHeroes(heroes);
      } catch (error) {
        console.error("Erreur de récupération des héros :", error);
        setAllHeroes([]);
      }
    };
    fetchHeroes();
  }, []);

  // Vérification de l'existence des vidéos
  const checkVideoExists = async (videoUrl) => {
    try {
      const response = await fetch(videoUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Mise à jour de la vidéo du héros
  useEffect(() => {
    if (allHeroes.length > 0) {
      const findVideoForHero = async () => {
        const hero = allHeroes[currentHeroIndex % allHeroes.length];
        const heroName = hero.name.toLowerCase().replace(/\s+/g, "-");
        const videoUrl = `/epic7-Hero/Animation/${heroName}.mp4`;
        
        const exists = await checkVideoExists(videoUrl);
        if (exists) {
          setVideoSource(videoUrl);
        }
      };
      
      findVideoForHero();
    }
  }, [currentHeroIndex, allHeroes]);

  // Rotation automatique des héros
  useEffect(() => {
    if (allHeroes.length > 0) {
      const interval = setInterval(() => {
        setCurrentHeroIndex(prev => (prev + 1) % allHeroes.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [allHeroes.length]);

  // Fonctions de recherche
  const performSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(term);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Erreur de recherche:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Animations variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

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

  const buttonVariants = {
    hover: {
      scale: 1.05,
      rotateY: 5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 17
      }
    }
  };

  // Particules flottantes
  const generateParticles = () => {
    return Array.from({ length: 30 }, (_, i) => (
      <motion.div
        key={i}
        className={`absolute w-1 h-1 rounded-full ${
          theme === 'dark' ? 'bg-blue-400/40' : 'bg-purple-400/40'
        }`}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.4, 0.8, 0.4],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ));
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}>
        <motion.div
          className={`p-8 rounded-2xl backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-white/40'
          } border`}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <FaStarOfLife className={`w-8 h-8 ${
            theme === 'dark' ? 'text-blue-400' : 'text-purple-600'
          }`} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      
      {/* Particules de fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {generateParticles()}
      </div>

      {/* Header premium */}
      <motion.header 
        className={`relative z-10 backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-white/30'
        } border-b`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Section profil */}
            <motion.div 
              className="flex items-center space-x-4"
              variants={itemVariants}
            >
              <motion.button
                onClick={() => navigate(`/profile/${user.id}`)}
                className={`flex items-center space-x-3 p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-white/10 hover:bg-white/20 border-white/20' 
                    : 'bg-white/40 hover:bg-white/60 border-white/40'
                } border`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <FaUser className="text-white text-lg" />
                </div>
                <div className="text-left">
                  <p className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {user.username}
                  </p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Niveau {user.level || 1}
                  </p>
                </div>
              </motion.button>
            </motion.div>

            {/* Titre majestueux */}
            <motion.div 
              className="text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className={`text-4xl font-bold bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-blue-400 via-purple-400 to-pink-400' 
                  : 'from-blue-600 via-purple-600 to-pink-600'
              } bg-clip-text text-transparent`}>
                Epic Seven
              </h1>
              <motion.p 
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Aventure épique vous attend
              </motion.p>
            </motion.div>

            {/* Ressources et actions */}
            <motion.div 
              className="flex items-center space-x-4"
              variants={itemVariants}
            >
              {/* Barre de ressources */}
              <div className="flex space-x-3">
                <motion.div 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-yellow-500/20 border-yellow-500/30' 
                      : 'bg-yellow-100/60 border-yellow-300/40'
                  } border`}
                  whileHover={{ scale: 1.05 }}
                >
                  <FaCoins className="text-yellow-500" />
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                  }`}>
                    {user.gold || 0}
                  </span>
                </motion.div>

                <motion.div 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-purple-500/20 border-purple-500/30' 
                      : 'bg-purple-100/60 border-purple-300/40'
                  } border`}
                  whileHover={{ scale: 1.05 }}
                >
                  <FaGem className="text-purple-500" />
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    {user.diamonds || 0}
                  </span>
                </motion.div>

                <motion.div 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-blue-500/20 border-blue-500/30' 
                      : 'bg-blue-100/60 border-blue-300/40'
                  } border`}
                  whileHover={{ scale: 1.05 }}
                >
                  <FaBolt className="text-blue-500" />
                  <span className={`font-bold ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    {user.energy || 0}
                  </span>
                </motion.div>
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-2">
                <motion.button
                  onClick={toggleTheme}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-yellow-400' 
                      : 'bg-white/40 hover:bg-white/60 text-purple-600'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
                </motion.button>

                <motion.button
                  onClick={() => setShowMailbox(true)}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-blue-400' 
                      : 'bg-white/40 hover:bg-white/60 text-blue-600'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <FaEnvelope size={20} />
                </motion.button>

                <motion.button
                  onClick={() => setShowSettings(true)}
                  className={`p-3 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-gray-300' 
                      : 'bg-white/40 hover:bg-white/60 text-gray-600'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <FaCog size={20} />
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  className="p-3 rounded-xl backdrop-blur-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all duration-300"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <FaSignOutAlt size={20} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Contenu principal */}
      <motion.main 
        className="max-w-7xl mx-auto px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Barre de recherche sophistiquée */}
        <motion.div 
          className="mb-8"
          variants={itemVariants}
        >
          <div className="relative max-w-2xl mx-auto">
            <motion.div 
              className={`relative backdrop-blur-md ${
                theme === 'dark' 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/30 border-white/40'
              } border rounded-2xl overflow-hidden`}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="flex items-center p-4">
                <FaSearch className={`w-5 h-5 mr-3 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <input
                  type="text"
                  placeholder="Rechercher des joueurs..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={`flex-1 bg-transparent outline-none placeholder-gray-500 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}
                />
                {isSearching && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FaStarOfLife className="w-5 h-5 text-purple-500" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Résultats de recherche */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-full mt-2 left-0 right-0 backdrop-blur-md ${
                    theme === 'dark' 
                      ? 'bg-black/40 border-white/20' 
                      : 'bg-white/40 border-white/40'
                  } border rounded-xl overflow-hidden shadow-2xl z-50`}
                >
                  {searchResults.slice(0, 5).map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 hover:bg-white/10 cursor-pointer transition-colors ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchTerm("");
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <FaUser className="text-white text-sm" />
                        </div>
                        <div>
                          <p className="font-medium">{result.username}</p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Niveau {result.level || 1}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Section Hero Video */}
        <motion.div 
          className="mb-12"
          variants={itemVariants}
        >
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            
            {/* Showcase vidéo du héros */}
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className={`relative w-80 h-56 rounded-2xl overflow-hidden backdrop-blur-md ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30' 
                  : 'bg-gradient-to-br from-purple-100/60 to-blue-100/60 border-purple-300/40'
              } border-2 shadow-2xl`}>
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                
                {/* Indicateur live */}
                <motion.div 
                  className="absolute top-4 left-4 z-20 flex items-center space-x-2"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
                  <span className="text-white text-sm font-medium backdrop-blur-sm bg-black/30 px-2 py-1 rounded">
                    LIVE
                  </span>
                </motion.div>

                {/* Bouton play */}
                <motion.button 
                  className="absolute inset-0 z-20 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                    <FaPlay className="text-white text-xl ml-1" />
                  </div>
                </motion.button>

                {/* Vidéo ou image de fallback */}
                {videoSource ? (
                  <video
                    ref={videoRef}
                    src={videoSource}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    onError={() => setVideoSource("")}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-900' 
                      : 'bg-gradient-to-br from-gray-200 to-gray-300'
                  }`}>
                    <FaStarOfLife className={`w-12 h-12 ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
                    }`} />
                  </div>
                )}

                {/* Effet shimmer */}
                <div className="absolute inset-0 shimmer-effect" />
              </div>
              
              {/* Info du héros */}
              {allHeroes.length > 0 && (
                <motion.div 
                  className={`mt-4 text-center backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/30 border-white/40'
                  } border rounded-xl p-4`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {allHeroes[currentHeroIndex]?.name || "Héros Mystérieux"}
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    ⭐ {allHeroes[currentHeroIndex]?.stars || 5} étoiles
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Informations complémentaires */}
            <motion.div 
              className="flex-1 space-y-6"
              variants={itemVariants}
            >
              <div>
                <h2 className={`text-3xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Bienvenue, {user.username} !
                </h2>
                <p className={`text-lg ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Prêt pour une nouvelle aventure épique dans le monde d'Epic Seven ?
                </p>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  className={`p-4 rounded-xl backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/30 border-white/40'
                  } border`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <FaMagic className="text-white" />
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {user.heroCount || 0}
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Héros
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className={`p-4 rounded-xl backdrop-blur-sm ${
                    theme === 'dark' 
                      ? 'bg-white/10 border-white/20' 
                      : 'bg-white/30 border-white/40'
                  } border`}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <FaCrosshairs className="text-white" />
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {user.wins || 0}
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Victoires
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Grille de navigation gaming */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
        >
          {navigationItems.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={item.action}
              className={`group relative p-6 rounded-2xl overflow-hidden backdrop-blur-md bg-gradient-to-br ${item.gradient} border border-white/20 shadow-2xl ${item.shadowColor} transition-all duration-300`}
              variants={itemVariants}
              whileHover={{ 
                scale: item.hoverScale,
                rotateY: 5,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 0.95 }}
              style={{
                transformStyle: "preserve-3d",
              }}
            >
              {/* Effet de particules au hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {Array.from({ length: 6 }, (_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>

              {/* Contenu du bouton */}
              <div className="relative z-10 text-center">
                <motion.div 
                  className="flex justify-center mb-3"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <div className="text-white text-3xl">
                    {item.icon}
                  </div>
                </motion.div>
                
                <h3 className="text-white font-bold text-lg mb-1">
                  {item.label}
                </h3>
                
                <p className="text-white/80 text-sm">
                  {item.description}
                </p>
              </div>

              {/* Effet shimmer */}
              <div className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Bordure animée */}
              <motion.div 
                className="absolute inset-0 border-2 border-white/0 rounded-2xl"
                whileHover={{ 
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  transition: { duration: 0.3 }
                }}
              />
            </motion.button>
          ))}
        </motion.div>

      </motion.main>

      {/* Overlays avec animations */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            className="fixed inset-0 backdrop-blur-sm bg-black/60 z-50 flex items-center justify-center p-4"
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
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <SettingsPanel />
            </motion.div>
          </motion.div>
        )}

        {showMailbox && (
          <motion.div 
            className="fixed inset-0 backdrop-blur-sm bg-black/60 z-50 flex items-center justify-center p-4"
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
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <MailboxOverlay onClose={() => setShowMailbox(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
