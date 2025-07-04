import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
fetchUserProfileById, 
sendFriendRequest, 
acceptFriendRequest, 
declineFriendRequest,
removeFriend 
} from '../services/userService';
import { getUserHeroes } from '../services/heroService';
import HeroProfileCard from '../components/hero/HeroProfileCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import { toast } from 'react-toastify';
import { heroImg, heroImgUnknown } from '../components/heroUtils';
import { ModernPageLayout, ModernCard, ModernButton, ModernModal, MusicController } from '../components/ui';
import { FaUser, FaUserPlus, FaUserCheck, FaUserMinus, FaCalendar, FaCrown, FaGamepad, FaStar, FaEye } from 'react-icons/fa';

const UserProfile = () => {
const { userId } = useParams();
const navigate = useNavigate();
const { t, language, theme } = useSettings();
const { preloadMusic, playDashboardMusic } = useMusic();
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [showHeroesOverlay, setShowHeroesOverlay] = useState(false);
const [heroes, setHeroes] = useState([]);
const [loadingHeroes, setLoadingHeroes] = useState(false);
const [selectedHero, setSelectedHero] = useState(null);

// Format date based on language (French: dd/mm/yyyy, Others: mm/dd/yyyy)
const formatDate = (dateString) => {
if (!dateString) return t("notSpecified", language) || 'Non spécifié';

try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t("notSpecified", language) || 'Non spécifié';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return language === 'fr' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
} catch (err) {
    console.error("Date formatting error:", err);
    return t("notSpecified", language) || 'Non spécifié';
}
};

useEffect(() => {
    // Précharger et démarrer la musique du dashboard
    preloadMusic();
    playDashboardMusic();
    
    const loadUserProfile = async () => {
    try {
        setLoading(true);
        const userData = await fetchUserProfileById(userId);
        setUser(userData);
        setError(null);
    } catch (err) {
        setError(t("userProfileLoadError", language) || 'Impossible de charger le profil de l\'utilisateur');
        console.error(err);
    } finally {
        setLoading(false);
    }
    };

    loadUserProfile();
}, [userId, language, t, preloadMusic, playDashboardMusic]);

const handleSendFriendRequest = async () => {
    try {
        const success = await sendFriendRequest(userId);
        if (success) {
            toast.success(t("friendRequestSuccess", language) || 'Demande d\'ami envoyée avec succès!');
            // Refresh user data to update the status
            const userData = await fetchUserProfileById(userId);
            setUser(userData);
        } else {
            toast.info(t("friendRequestAlreadySent", language) || 'Une demande d\'ami a déjà été envoyée.');
        }
    } catch (err) {
        toast.error(t("friendRequestError", language) || 'Erreur lors de l\'envoi de la demande d\'ami');
        console.error(err);
    }
};

const handleShowHeroes = async () => {
    try {
    setLoadingHeroes(true);
    // Utiliser getUserHeroes du service heroService avec l'ID utilisateur
    const heroesData = await getUserHeroes(userId);
    setHeroes(heroesData || []);
    setShowHeroesOverlay(true);
    } catch (err) {
    console.error("Erreur lors du chargement des héros:", err);
    // Fallback à un tableau vide en cas d'erreur
    setHeroes([]);
    setShowHeroesOverlay(true);
    } finally {
    setLoadingHeroes(false);
    }
};

const closeHeroOverlay = () => {
    setShowHeroesOverlay(false);
    setSelectedHero(null);
};

// Render appropriate friend button based on friendship status
const renderFriendButton = () => {
if (!user) return null;

switch(user.friendshipStatus) {
    case 'SELF':
    // Don't render a button for own profile
    return null;
    case 'ACCEPTED':
    return (
        <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-4 py-2 rounded-lg flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {t("friend", language) || "Ami"}
        </div>
    );
    case 'REQUESTED':
    return (
        <button 
        disabled
        className="bg-gray-400 text-white font-bold py-2 px-6 rounded-lg shadow cursor-not-allowed"
        >
        {t("requestSent", language) || "Demande envoyée"}
        </button>
    );
    case 'PENDING':
    return (
        <div className="flex gap-2">
        <button 
            onClick={() => handleAcceptFriend()} 
            className="bg-green-600 hover:bg-green-700 transition text-white font-bold py-2 px-4 rounded-lg shadow"
        >
            {t("accept", language) || "Accepter"}
        </button>
        <button 
            onClick={() => handleDeclineFriend()} 
            className="bg-red-600 hover:bg-red-700 transition text-white font-bold py-2 px-4 rounded-lg shadow"
        >
            {t("decline", language) || "Refuser"}
        </button>
        </div>
    );
    case 'NONE':
    default:
    return (
        <button 
        onClick={() => handleSendFriendRequest()} 
        className="bg-purple-600 hover:bg-purple-700 transition text-white font-bold py-2 px-6 rounded-lg shadow"
        >
        {t("sendFriendRequest", language) || "Envoyer une demande d'ami"}
        </button>
    );
}
};

const handleAcceptFriend = async () => {
try {
    const success = await acceptFriendRequest(userId);
    if (success) {
    toast.success(t("friendRequestAccepted", language) || 'Demande d\'ami acceptée!');
    // Refresh user data to update the status
    const userData = await fetchUserProfileById(userId);
    setUser(userData);
    }
} catch (err) {
    toast.error(t("friendAcceptError", language) || 'Erreur lors de l\'acceptation de la demande');
    console.error(err);
}
};

const handleDeclineFriend = async () => {
try {
    const success = await declineFriendRequest(userId);
    if (success) {
    toast.info(t("friendRequestDeclined", language) || 'Demande d\'ami refusée');
    // Refresh user data to update the status
    const userData = await fetchUserProfileById(userId);
    setUser(userData);
    }
} catch (err) {
    toast.error(t("friendDeclineError", language) || 'Erreur lors du refus de la demande');
    console.error(err);
}
};

const handleRemoveFriend = async () => {
try {
    const success = await removeFriend(userId);
    if (success) {
    toast.info(t("friendRemoved", language) || 'Ami supprimé');
    // Refresh user data to update the status
    const userData = await fetchUserProfileById(userId);
    setUser(userData);
    }
} catch (err) {
    toast.error(t("friendRemoveError", language) || 'Erreur lors de la suppression de l\'ami');
    console.error(err);
}
};

// Calculate win rate percentage
const calculateWinRate = () => {
  const wins = user.winNumber || 0;
  const losses = user.loseNumber || 0;
  const totalMatches = wins + losses;
  
  if (totalMatches === 0) return 0;
  return Math.round((wins / totalMatches) * 100);
};

// Component for win rate pie chart
const WinRatePieChart = () => {
  const winRate = calculateWinRate();
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (winRate / 100) * circumference;
  
  return (
    <div className="relative w-24 h-24 mx-auto my-4">
      {/* Background circle (red for losses) */}
      <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          stroke="#f87171" 
          strokeWidth="12" 
          fill="none" 
        />
        {/* Foreground circle (green for wins) */}
        <circle 
          cx="50" 
          cy="50" 
          r={radius} 
          stroke="#4ade80" 
          strokeWidth="12" 
          fill="none" 
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Percentage text in the middle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{winRate}%</span>
      </div>
    </div>
  );
};

// Fonction pour obtenir la couleur du tier RTA
const getRtaTierColor = (tier) => {
  switch (tier?.toLowerCase()) {
    case 'bronze':
      return 'bg-amber-600 text-white';
    case 'silver':
      return 'bg-gray-400 text-black';
    case 'gold':
      return 'bg-yellow-400 text-black';
    case 'platinum':
      return 'bg-cyan-400 text-black';
    case 'diamond':
      return 'bg-blue-400 text-white';
    case 'master':
      return 'bg-purple-500 text-white';
    case 'grandmaster':
      return 'bg-red-500 text-white';
    case 'legend':
      return 'bg-gradient-to-r from-yellow-400 to-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

// Composant pour afficher la progression vers le tier suivant
const RtaTierProgress = ({ currentPoints, currentTier }) => {
  const tiers = [
    { name: 'Bronze', points: 0 },
    { name: 'Silver', points: 1200 },
    { name: 'Gold', points: 1400 },
    { name: 'Platinum', points: 1600 },
    { name: 'Diamond', points: 1800 },
    { name: 'Master', points: 2000 },
    { name: 'GrandMaster', points: 2200 },
    { name: 'Legend', points: 2400 }
  ];

  const currentTierIndex = tiers.findIndex(tier => tier.name === currentTier);
  const nextTierIndex = currentTierIndex + 1;

  if (nextTierIndex >= tiers.length) {
    // Tier maximum atteint
    return (
      <div className="text-center text-sm text-purple-600 dark:text-purple-400 font-semibold">
        🏆 {t("maxTierReached", language) || "Tier maximum atteint!"}
      </div>
    );
  }

  const currentTierMinPoints = tiers[currentTierIndex].points;
  const nextTierMinPoints = tiers[nextTierIndex].points;
  const pointsInCurrentTier = currentPoints - currentTierMinPoints;
  const pointsNeededForNextTier = nextTierMinPoints - currentTierMinPoints;
  const progress = Math.min(100, (pointsInCurrentTier / pointsNeededForNextTier) * 100);
  const pointsToNext = nextTierMinPoints - currentPoints;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{currentTier}</span>
        <span>{tiers[nextTierIndex].name}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center text-xs text-gray-600 dark:text-gray-400">
        {pointsToNext > 0 ? (
          <span>{pointsToNext} points vers {tiers[nextTierIndex].name}</span>
        ) : (
          <span>🎉 Éligible pour promotion!</span>
        )}
      </div>
    </div>
  );
};

if (loading) {
  return (
    <ModernPageLayout 
      title={t("userProfile", language) || "Profil utilisateur"}
      subtitle="Chargement du profil..."
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
          <FaUser className="w-8 h-8 text-purple-500" />
        </motion.div>
      </div>
    </ModernPageLayout>
  );
}

if (error) {
  return (
    <ModernPageLayout 
      title={t("userProfile", language) || "Profil utilisateur"}
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

if (!user) {
  return (
    <ModernPageLayout 
      title={t("userProfile", language) || "Profil utilisateur"}
      subtitle="Utilisateur introuvable"
      showBackButton={false}
    >
      <ModernCard className="text-center">
        <FaUser className={`w-16 h-16 mx-auto mb-4 ${
          theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
        }`} />
        <h3 className={`text-xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Utilisateur introuvable
        </h3>
        <p className={`mb-4 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {t("noPlayerWithName", language) || "Aucun utilisateur trouvé avec cet identifiant"}
        </p>
        <ModernButton 
          variant="secondary" 
          onClick={() => navigate('/dashboard')}
        >
          Retour au tableau de bord
        </ModernButton>
      </ModernCard>
    </ModernPageLayout>
  );
}
//     </main>
// );

return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
    <MusicController />
    <div className="max-w-6xl mx-auto">
        {/* Return button */}
        <button 
        onClick={() => navigate(-1)} 
        className="mb-4 bg-white dark:bg-[#3a3660] hover:bg-gray-100 dark:hover:bg-[#4a4680] text-gray-900 dark:text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        {t("back", language)}
        </button>
        
        {/* Header avec avatar et info de base */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img 
            src={heroImg("mavuika") } 
            alt={user.username}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-600 object-cover shadow-lg"
            onError={(e) => {
                e.target.onerror = null;
                e.target.src = heroImgUnknown;
            }}
            />
            <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <div className="bg-purple-100 dark:bg-[#3a3660] inline-block px-3 py-1 rounded-full text-sm mt-2">
                {t("level", language)}: {user.level || 'N/A'}
            </div>
            </div>
            
            {renderFriendButton()}
        </div>
        </div>
        
        {/* Grid d'informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-300">{t("personalInfo", language) || "Informations personnelles"}</h3>
            <div className="space-y-2">
            <p><strong>{t("memberSince", language) || "Membre depuis"}:</strong> {formatDate(user.registerDate)}</p>
            <p><strong>{t("lastLogin", language) || "Dernière connexion"}:</strong> {formatDate(user.lastLoginDate)}</p>
            </div>
        </div>
        
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-300">{t("gameStats", language) || "Statistiques de jeu"}</h3>
            <div className="space-y-2">
            <p><strong>{t("rank", language) || "Rang"}:</strong> {user.rank || t("unranked", language) || 'Non classé'}</p>
            <p><strong>{t("arenaTier", language) || "Tier d'arène"}:</strong> {user.arenaTier || t("unranked", language) || 'Non classé'}</p>
            
            {/* Win rate pie chart */}
            <div className="mt-4">
                <p className="text-center font-semibold mb-2">{t("winRate", language) || "Taux de victoire"}</p>
                <WinRatePieChart />
                <div className="flex justify-center gap-6 mt-2 text-sm">
                <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-1"></span>
                    <span>{user.winNumber || 0} {t("wins", language) || "Victoires"}</span>
                </div>
                <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-1"></span>
                    <span>{user.loseNumber || 0} {t("losses", language) || "Défaites"}</span>
                </div>
                </div>
            </div>
            </div>
        </div>
        
        {/* Section RTA (Real Time Arena) */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-300">
                <span className="mr-2">⚔️</span>
                {t("rtaStats", language) || "Statistiques RTA"}
            </h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span><strong>{t("rtaTier", language) || "Rang RTA"}:</strong></span>
                    <div className="flex items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRtaTierColor(user.rtaTier)}`}>
                            {user.rtaTier || 'Bronze'}
                        </span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span><strong>{t("rtaPoints", language) || "Points RTA"}:</strong></span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-bold">{user.rtaPoints || 1000}</span>
                </div>
                
                {/* Progress bar pour le tier suivant */}
                <RtaTierProgress currentPoints={user.rtaPoints || 1000} currentTier={user.rtaTier || 'Bronze'} />
            </div>
        </div>
        
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-300">{t("community", language) || "Communauté"}</h3>
            <div className="space-y-2">
            <p><strong>{t("guild", language) || "Guilde"}:</strong> {user.guild || t("none", language) || 'Aucune'}</p>
            <p><strong>{t("friends", language) || "Amis"}:</strong> {user.friendNumber || 0}</p>
            </div>
        </div>
        </div>
        
        {/* Section de héros */}
        <div className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">{t("heroCollection", language) || "Collection de héros"}</h2>
            <p className="mt-2">{t("totalHeroes", language) || "Nombre total de héros"}: {user.heroesNumber || 0}</p>
            </div>
            
            <button 
            className="bg-purple-600 hover:bg-purple-700 transition text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2"
            onClick={handleShowHeroes}
            disabled={loadingHeroes}
            >
            {loadingHeroes ? (
                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
            )}
            {t("viewPlayerHeroes", language) || "Voir les héros du joueur"}
            </button>
        </div>
        
        {/* Aperçu de quelques héros (si disponible) */}
        {user.featuredHeroes && user.featuredHeroes.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {user.featuredHeroes.map((hero, index) => (
                <div 
                key={index} 
                className="bg-purple-50 dark:bg-[#3a3660] rounded-lg p-3 text-center cursor-pointer hover:bg-purple-100 dark:hover:bg-[#4a4680] transition-all"
                onClick={() => setSelectedHero(hero)}
                >
                <img 
                    src={heroImg(hero.name)}
                    alt={hero.name}
                    className="w-16 h-16 mx-auto rounded-full bg-gray-700 object-cover"
                    onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = heroImgUnknown;
                    }}
                />
                <p className="mt-2 font-medium text-sm">{hero.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">{t("level", language)} {hero.level}</p>
                </div>
            ))}
            </div>
        )}
        </div>
    </div>

    {/* Overlay de héros */}
    <AnimatePresence>
        {showHeroesOverlay && (
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={closeHeroOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-white dark:bg-[#2f2b50] rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative z-50"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-300">{t("heroesOf", language) || "Héros de"} {user.username}</h2>
                        <button 
                            onClick={closeHeroOverlay}
                            className="bg-gray-100 dark:bg-[#3a3660] hover:bg-gray-200 dark:hover:bg-[#4a4680] p-2 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {loadingHeroes ? (
                        <div className="py-20 flex justify-center">
                            <div className="animate-spin h-12 w-12 border-4 border-purple-500 rounded-full border-t-transparent"></div>
                        </div>
                    ) : heroes.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {heroes.map((hero) => (
                                <HeroProfileCard
                                    key={hero.id}
                                    heroInstance={hero}
                                    onSelect={setSelectedHero}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-xl">{t("noHeroesFound", language) || "Aucun héro trouvé"}</p>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">{t("playerHasNoHeroes", language) || "Ce joueur n'a pas encore de héros dans sa collection"}</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* Détail du héro sélectionné */}
    <AnimatePresence>
        {selectedHero && (
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedHero(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                >
                    <button
                        onClick={() => setSelectedHero(null)}
                        className="absolute top-2 right-3 text-2xl hover:text-red-400 z-10"
                    >×</button>

                    <div className="flex flex-col items-center">
                        <h2 className="text-xl md:text-2xl font-bold text-center mb-2 mt-2">
                            {selectedHero.name || selectedHero.hero?.name || t("unknownHero", language) || 'Héros inconnu'}
                        </h2>
                        <div className="text-sm text-center mb-3">
                            🌟 {selectedHero.rarity || selectedHero.hero?.rarity} | 🔮 {selectedHero.element || selectedHero.hero?.element}
                        </div>

                        <div className="w-full max-w-[300px] aspect-[4/5] overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-[#1a1a2e] rounded-xl mb-4">
                            <img 
                                src={heroImg(selectedHero.name || selectedHero.hero?.name)}
                                alt={selectedHero.name || selectedHero.hero?.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = heroImgUnknown;
                                }}
                            />
                        </div>

                        <div className="space-y-2 text-sm mb-4 w-full bg-gray-100 dark:bg-[#2a2a40] p-3 rounded-lg">
                            <p>⚔️ {t("attack", language)} : <span className="float-right font-bold">{selectedHero.totalAttack || selectedHero.hero?.baseAttack || '?'}</span></p>
                            <p>🛡️ {t("defense", language)} : <span className="float-right font-bold">{selectedHero.totalDefense || selectedHero.hero?.baseDefense || '?'}</span></p>
                            <p>💨 {t("speed", language)} : <span className="float-right font-bold">{selectedHero.totalSpeed || selectedHero.hero?.baseSpeed || '?'}</span></p>
                            <p>❤️ {t("health", language)} : <span className="float-right font-bold">{selectedHero.totalHealth || selectedHero.hero?.health || '?'}</span></p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
    </main>
);
};

export default UserProfile;