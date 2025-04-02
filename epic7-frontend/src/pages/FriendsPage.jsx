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
    console.log("Loading friends...");
    setLoading(true);
    setError(null);
    
    try {
    // Just fetch friends without extra token verification
    const friendsList = await fetchFriends(-1, 0, 100);
    
    if (Array.isArray(friendsList)) {
        setFriends(friendsList);
        console.log(`Loaded ${friendsList.length} friends successfully`);
    } else {
        throw new Error("Format de données incorrect");
    }
    } catch (err) {
    console.error("Erreur lors du chargement des amis:", err);
    
    // More specific error message
    let errorMessage = "Impossible de charger la liste d'amis.";
    
    setError(errorMessage);
    setFriends([]);
    } finally {
    setLoading(false);
    }
}, [navigate, retryCount]);

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
        setError("Veuillez vous reconnecter");
        setLoading(false);
        // Redirection vers la page de connexion après un délai
        setTimeout(() => navigate("/"), 2000);
    }
    };
    
    checkAuth();
}, [navigate, loadFriends, retryCount]);

const handleRetry = () => {
    setRetryCount(prev => prev + 1);
};

const handleRemoveFriend = async (friendId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet ami ?")) {
    return;
    }
    
    try {
    const result = await removeFriend(friendId);
    console.log("Remove friend result:", result);
    // Refresh friends list
    loadFriends();
    } catch (err) {
    console.error("Erreur lors de la suppression de l'ami:", err);
    setError("Impossible de supprimer cet ami");
    }
};

const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!newFriendId || isNaN(Number(newFriendId))) {
    setRequestStatus({
        success: false,
        message: "Veuillez entrer un ID valide"
    });
    return;
    }

    try {
    const result = await sendFriendRequest(Number(newFriendId));
    console.log("Send friend request result:", result);
    if (result) {
        setRequestStatus({
        success: true,
        message: "Demande d'ami envoyée avec succès !"
        });
        setNewFriendId("");
    } else {
        throw new Error("Échec de l'envoi de la demande d'ami");
    }
    } catch (err) {
    console.error("Erreur lors de l'envoi de la demande d'ami:", err);
    setRequestStatus({
        success: false,
        message: err.response?.data?.message || "Impossible d'envoyer la demande d'ami"
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
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white p-6">
    <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
        <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-purple-300 hover:text-purple-100 transition"
        >
            <FaArrowLeft className="mr-2" /> Retour au tableau de bord
        </button>
        <h1 className="text-3xl font-bold">{t ? t("friends", language) : "Amis"}</h1>
        </header>

        <section className="bg-[#2f2b50] rounded-xl shadow-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Ajouter un ami</h2>
        <form onSubmit={handleSendRequest} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
            <input
                type="text"
                value={newFriendId}
                onChange={(e) => setNewFriendId(e.target.value)}
                placeholder="ID de l'utilisateur à ajouter"
                className="w-full bg-[#1e1b3a] border border-purple-700 rounded-lg px-4 py-2 text-white"
            />
            </div>
            <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition flex items-center justify-center"
            >
            <FaUserPlus className="mr-2" /> Envoyer une demande
            </button>
        </form>
        
        {requestStatus && (
            <div className={`mt-4 p-3 rounded-lg ${requestStatus.success ? 'bg-green-600 bg-opacity-20 text-green-400' : 'bg-red-600 bg-opacity-20 text-red-400'}`}>
            {requestStatus.message}
            </div>
        )}
        </section>

        <section className="bg-[#2f2b50] rounded-xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-bold mb-2 md:mb-0">
            Mes amis ({Array.isArray(friends) ? friends.length : 0})
            </h2>
            <div className="flex items-center gap-2">
            <div className="relative w-full md:w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                type="text"
                placeholder="Rechercher un ami..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e1b3a] border border-purple-700 rounded-lg pl-10 pr-4 py-2 text-white"
                />
            </div>
            <button 
                onClick={handleRetry}
                className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg"
                title="Actualiser la liste"
            >
                <FaSync className={loading ? "animate-spin" : ""} />
            </button>
            </div>
        </div>

        {loading ? (
            <div className="text-center py-8 text-gray-400">
            <div className="animate-spin mx-auto w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
            Chargement des amis...
            </div>
        ) : error ? (
            <div className="text-center py-8 text-red-400 bg-red-900 bg-opacity-10 rounded-md p-4">
            <p>{error}</p>
            <button 
                onClick={handleRetry}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
            >
                <FaSync className="mr-2" /> Réessayer
            </button>
            </div>
        ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
            {searchQuery ? "Aucun ami ne correspond à votre recherche" : "Vous n'avez pas encore d'amis"}
            </div>
        ) : (
            <ul className="space-y-3">
            {filteredFriends.map(friend => (
                <li key={friend.id} className="bg-[#252042] rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="bg-purple-700 rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    {friend.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                    <h3 className="font-bold">{friend.username}</h3>
                    <p className="text-sm text-gray-400">Niveau {friend.level}</p>
                    {friend.friendshipStatus === "PENDING" && (
                    <span className="text-xs text-yellow-400 flex items-center">
                        <FaUserClock className="mr-1" /> En attente d'acceptation
                    </span>
                    )}
                    </div>
                </div>
                <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                    title="Supprimer de ma liste d'amis"
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
