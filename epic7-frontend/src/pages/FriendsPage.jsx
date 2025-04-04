import React, { useEffect, useState, useCallback } from "react";
import { fetchFriends, removeFriend, sendFriendRequest, fetchUserProfile } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import { FaArrowLeft, FaUserPlus, FaUserMinus, FaSearch, FaSync, FaUserClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const FriendsPage = () => {
const [friends, setFriends] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [searchQuery, setSearchQuery] = useState("");
const [newFriendId, setNewFriendId] = useState("");
const [requestStatus, setRequestStatus] = useState(null);
const [retryCount, setRetryCount] = useState(0);
const { language, t } = useSettings();
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
    if (result) {
        setRequestStatus({
        success: true,
        message: t("friendRequestSuccess", language)
        });
        setNewFriendId("");
        // Refresh friends list after adding a new friend
        loadFriends();
    } else {
        throw new Error(t("friendRequestError", language));
    }
    } catch (err) {
    console.error("Erreur lors de l'envoi de la demande d'ami:", err);
    setRequestStatus({
        success: false,
        message: err.response?.data?.message || t("friendRequestError", language)
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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-[#1e1b3a] dark:to-[#2a2250] text-gray-900 dark:text-white p-6">
    <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
        <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 transition"
        >
            <FaArrowLeft className="mr-2" /> {t("backToDashboard", language)}
        </button>
        <h1 className="text-3xl font-bold">{t("friends", language)}</h1>
        </header>

        <section className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">{t("addFriend", language)}</h2>
        <form onSubmit={handleSendRequest} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
            <input
                type="text"
                value={newFriendId}
                onChange={(e) => setNewFriendId(e.target.value)}
                placeholder={t("userIdToAdd", language)}
                className="w-full bg-gray-50 dark:bg-[#1e1b3a] border border-gray-300 dark:border-purple-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
            />
            </div>
            <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition flex items-center justify-center"
            >
            <FaUserPlus className="mr-2" /> {t("sendRequest", language)}
            </button>
        </form>
        
        {requestStatus && (
            <div className={`mt-4 p-3 rounded-lg ${requestStatus.success ? 'bg-green-100 dark:bg-green-900 bg-opacity-20 dark:bg-opacity-20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900 bg-opacity-20 dark:bg-opacity-20 text-red-700 dark:text-red-400'}`}>
            {requestStatus.message}
            </div>
        )}
        </section>

        <section className="bg-white dark:bg-[#2f2b50] rounded-xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-bold mb-2 md:mb-0">
            {t("myFriends", language)} ({Array.isArray(friends) ? friends.length : 0})
            </h2>
            <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                type="text"
                placeholder={t("searchFriend", language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1e1b3a] border border-gray-300 dark:border-purple-700 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white"
                />
            </div>
            <button 
                onClick={handleRetry}
                className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg text-white"
                title={t("refreshList", language)}
            >
                <FaSync className={loading ? "animate-spin" : ""} />
            </button>
            </div>
        </div>

        {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <div className="animate-spin mx-auto w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
            {t("loadingFriends", language)}
            </div>
        ) : error ? (
            <div className="text-center py-8 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 bg-opacity-10 dark:bg-opacity-10 rounded-md p-4">
            <p>{error}</p>
            <button 
                onClick={handleRetry}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
            >
                <FaSync className="mr-2" /> {t("retry", language)}
            </button>
            </div>
        ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            {searchQuery ? t("noFriendsMatch", language) : t("noFriendsYet", language)}
            </div>
        ) : (
            <ul className="space-y-3">
            {filteredFriends.map(friend => (
                <li key={friend.id} className="bg-gray-50 dark:bg-[#252042] rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="bg-purple-700 rounded-full w-12 h-12 flex items-center justify-center mr-4 text-white">
                    {friend.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                    <h3 className="font-bold">
                        <a 
                            href={`/profile/${friend.id}`}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition"
                        >
                            {friend.username}
                        </a>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("level", language)} {friend.level}</p>
                    {friend.friendshipStatus === "PENDING" && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center">
                        <FaUserClock className="mr-1" /> {t("pendingAcceptance", language)}
                        </span>
                    )}
                    </div>
                </div>
                <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                    title={t("removeFriend", language)}
                >
                    <FaUserMinus />
                </button>
                </li>
            ))}
            </ul>
        )}
        </section>
    </div>
    </main>
);
};

export default FriendsPage;
