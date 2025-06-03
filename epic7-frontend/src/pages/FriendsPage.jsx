import React, { useEffect, useState, useCallback } from "react";
import { fetchFriends, removeFriend, sendFriendRequest, fetchUserProfile } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import { FaArrowLeft, FaUserPlus, FaUserMinus, FaSearch, FaSync, FaUserClock, FaUsers, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ModernPageLayout, ModernCard, ModernButton, ModernSearchBar } from "../components/ui";
import { toast } from "react-toastify";

const FriendsPage = () => {
const [friends, setFriends] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [searchQuery, setSearchQuery] = useState("");
const [newFriendId, setNewFriendId] = useState("");
const [requestStatus, setRequestStatus] = useState(null);
const [retryCount, setRetryCount] = useState(0);
const { language, t, theme } = useSettings();
const navigate = useNavigate();

// Debug log pour vérifier que le composant est chargé
console.log("FriendsPage component mounted, retry count:", retryCount);

// Memoize loadFriends
const loadFriends = useCallback(async () => {
    console.log("Loading friends... attempt:", retryCount + 1);
    setLoading(true);
    setError(null);
    
    try {
    // Just fetch friends without extra token verification
    const friendsList = await fetchFriends(-1, 0, 100);
    
    if (Array.isArray(friendsList)) {
        setFriends(friendsList);
        console.log(`Loaded ${friendsList.length} friends successfully`);
    } else {
        throw new Error(t("incorrectDataFormat", language) || "Format de données incorrect");
    }
    } catch (err) {
    console.error("Erreur lors du chargement des amis:", err);
    
    // More specific error message
    let errorMessage = t("friendsLoadError", language) || "Impossible de charger la liste d'amis.";
    
    setError(errorMessage);
    setFriends([]);
    } finally {
    setLoading(false);
    }
}, [navigate, retryCount, language, t]);

useEffect(() => {
    // Debug log pour vérifier que le useEffect s'exécute
    console.log("FriendsPage useEffect triggered");
    
    // Vérifier si l'utilisateur est connecté avant de charger les amis
    const checkAuth = async () => {
    try {
        // Cette requête vérifie l'authentification
        const userProfile = await fetchUserProfile();
        console.log("User profile loaded:", userProfile);
        await loadFriends();
    } catch (err) {
        console.error("Erreur d'authentification:", err);
        setError(t("authError", language));
        setLoading(false);
        // Redirection vers la page de connexion après un délai
        setTimeout(() => navigate("/"), 2000);
    }
    };
    
    checkAuth();
}, [navigate, loadFriends, language, t]);

const handleRetry = () => {
    setRetryCount(prev => prev + 1);
};

const handleRemoveFriend = async (friendId) => {
    if (!window.confirm(t("confirmRemoveFriend", language))) {
    return;
    }
    
    try {
    const result = await removeFriend(friendId);
    console.log("Remove friend result:", result);
    // Refresh friends list
    loadFriends();
    } catch (err) {
    console.error("Erreur lors de la suppression de l'ami:", err);
    setError(t("friendRemoveError", language) || "Impossible de supprimer cet ami");
    }
};

const handleSendRequest = async (e) => {
e.preventDefault();
if (!newFriendId || isNaN(Number(newFriendId))) {
    setRequestStatus({
    success: false,
    message: t("enterValidId", language)
    });
    return;
}

try {
    const result = await sendFriendRequest(Number(newFriendId));
    console.log("Send friend request result:", result);
    setRequestStatus({
    success: true,
    message: t("friendRequestSuccess", language)
    });
    setNewFriendId("");
    // Refresh friends list after adding a new friend
    loadFriends();
} catch (err) {
    console.error("Friend request error:", err);
    
    // Handle specific error codes
    let errorMessage = t("friendRequestError", language);
    
    if (err.code === "SELF_FRIEND_REQUEST") {
    errorMessage = t("cannotAddSelf", language) || "You cannot add yourself as a friend";
    } else if (err.code === "DUPLICATE_FRIEND_REQUEST") {
    errorMessage = t("alreadySentRequest", language) || "You've already sent a request to this user";
    } else if (err.code === "ALREADY_FRIENDS") {
    errorMessage = t("alreadyFriends", language) || "You are already friends with this user";
    } else if (err.code === "FRIEND_NOT_FOUND") {
    errorMessage = t("userNotFound", language) || "User not found";
    }
    
    setRequestStatus({
    success: false,
    message: errorMessage
    });
}
};

// Sécurité pour éviter des erreurs si friends n'est pas un tableau
const filteredFriends = Array.isArray(friends) 
    ? friends.filter(friend => friend?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

// Debug render
console.log("Rendering FriendsPage with state:", { 
    friends,
    friendsCount: friends?.length, 
    loading, 
    hasError: !!error 
});

return (
    <ModernPageLayout
      title={t("friends", language)}
      backTo="/dashboard"
      backLabel={t("backToDashboard", language)}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full mb-4"
          />
          <p className="text-lg text-purple-300">{t("loadingFriends", language)}</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-red-400 mb-2">{t("error", language)}</h3>
          <p className="text-purple-300 mb-6 text-center max-w-md">{error}</p>
          <ModernButton onClick={handleRetry} variant="primary">
            <FaSync className="mr-2" />
            {t("retry", language)}
          </ModernButton>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Section Ajouter un ami */}
          <ModernCard title={t("addFriend", language)} icon={<FaUserPlus />}>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newFriendId}
                    onChange={(e) => setNewFriendId(e.target.value)}
                    placeholder={t("userIdToAdd", language)}
                    className="w-full bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all"
                  />
                </div>
                <ModernButton type="submit" variant="primary">
                  <FaUserPlus className="mr-2" />
                  {t("sendRequest", language)}
                </ModernButton>
              </div>
              
              {requestStatus && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-xl backdrop-blur-sm ${
                    requestStatus.success 
                      ? 'bg-green-500/20 border border-green-400/30 text-green-300' 
                      : 'bg-red-500/20 border border-red-400/30 text-red-300'
                  }`}
                >
                  {requestStatus.message}
                </motion.div>
              )}
            </form>
          </ModernCard>

          {/* Section Liste des amis */}
          <ModernCard 
            title={`${t("myFriends", language)} (${Array.isArray(friends) ? friends.length : 0})`}
            icon={<FaUsers />}
          >
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <ModernSearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={t("searchFriend", language)}
                  />
                </div>
                <ModernButton onClick={handleRetry} variant="secondary">
                  <FaSync className={`mr-2 ${loading ? "animate-spin" : ""}`} />
                  {t("refreshList", language)}
                </ModernButton>
              </div>

              {filteredFriends.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">👥</div>
                  <p className="text-xl text-purple-300">
                    {searchQuery ? t("noFriendsMatch", language) : t("noFriendsYet", language)}
                  </p>
                </div>
              ) : (
                <motion.div 
                  className="grid gap-4"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {filteredFriends.map((friend, index) => (
                    <motion.div
                      key={friend.id}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        show: { opacity: 1, x: 0 }
                      }}
                      className="bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 hover:bg-black/30 hover:border-purple-400/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {friend.username?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              <button
                                onClick={() => navigate(`/profile/${friend.id}`)}
                                className="hover:text-purple-300 transition-colors"
                              >
                                {friend.username}
                              </button>
                            </h3>
                            <p className="text-sm text-purple-300">
                              {t("level", language)} {friend.level}
                            </p>
                            {friend.friendshipStatus === "PENDING" && (
                              <span className="inline-flex items-center text-xs text-yellow-400 mt-1">
                                <FaUserClock className="mr-1" />
                                {t("pendingAcceptance", language)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ModernButton
                            onClick={() => navigate(`/profile/${friend.id}`)}
                            variant="secondary"
                            size="sm"
                          >
                            <FaEye />
                          </ModernButton>
                          <ModernButton
                            onClick={() => handleRemoveFriend(friend.id)}
                            variant="danger"
                            size="sm"
                          >
                            <FaUserMinus />
                          </ModernButton>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </ModernCard>
        </motion.div>
      )}
    </ModernPageLayout>
  );
};

export default FriendsPage;
