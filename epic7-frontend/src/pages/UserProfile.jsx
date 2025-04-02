import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchUserProfileById, sendFriendRequest } from '../services/userService';
import { getUserHeroes } from '../services/heroService';
import HeroProfileCard from '../components/hero/HeroProfileCard';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfile = () => {
const { userId } = useParams();
const navigate = useNavigate();
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [showHeroesOverlay, setShowHeroesOverlay] = useState(false);
const [heroes, setHeroes] = useState([]);
const [loadingHeroes, setLoadingHeroes] = useState(false);
const [selectedHero, setSelectedHero] = useState(null);

useEffect(() => {
    const loadUserProfile = async () => {
    try {
        setLoading(true);
        const userData = await fetchUserProfileById(userId);
        setUser(userData);
        setError(null);
    } catch (err) {
        setError('Impossible de charger le profil de l\'utilisateur');
        console.error(err);
    } finally {
        setLoading(false);
    }
    };

    loadUserProfile();
}, [userId]);

const handleSendFriendRequest = async () => {
    try {
    await sendFriendRequest(userId);
    alert('Demande d\'ami envoyée avec succès!');
    } catch (err) {
    alert('Erreur lors de l\'envoi de la demande d\'ami');
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

if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white">
    Chargement...
    </main>
);

if (error) return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white">
    <div className="bg-red-600 p-4 rounded-lg">{error}</div>
    </main>
);

if (!user) return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white">
    <div className="bg-[#2f2b50] p-4 rounded-lg">Aucun utilisateur trouvé</div>
    </main>
);

return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white p-6">
    <div className="max-w-6xl mx-auto">
        {/* Header avec avatar et info de base */}
        <div className="bg-[#2f2b50] rounded-xl shadow-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <img 
            src={user.avatar || "/epic7-Hero/sprite-hero/unknown.png"} 
            alt={user.username}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-600 object-cover shadow-lg"
            onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
            }}
            />
            <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <div className="bg-[#3a3660] inline-block px-3 py-1 rounded-full text-sm mt-2">
                Niveau: {user.level || 'N/A'}
            </div>
            </div>
            
            <button 
            onClick={handleSendFriendRequest} 
            className="bg-purple-600 hover:bg-purple-700 transition text-white font-bold py-2 px-6 rounded-lg shadow"
            >
            Envoyer une demande d'ami
            </button>
        </div>
        </div>
        
        {/* Grid d'informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-300">Informations personnelles</h3>
            <div className="space-y-2">
            <p><strong>Membre depuis:</strong> {user.registrationDate || 'Non spécifié'}</p>
            <p><strong>Dernière connexion:</strong> {user.lastLoginDate || 'Non spécifié'}</p>
            </div>
        </div>
        
        <div className="bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-300">Statistiques de jeu</h3>
            <div className="space-y-2">
            <p><strong>Rang:</strong> {user.rank || 'Non classé'}</p>
            <p><strong>Tier d'arène:</strong> {user.arenaTier || 'Non classé'}</p>
            <p><strong>Matchs gagnés:</strong> {user.wins || 0}</p>
            <p><strong>Matchs perdus:</strong> {user.losses || 0}</p>
            </div>
        </div>
        
        <div className="bg-[#2f2b50] rounded-xl shadow-lg p-5 hover:ring-2 hover:ring-purple-400 transition">
            <h3 className="text-xl font-bold mb-4 text-purple-300">Communauté</h3>
            <div className="space-y-2">
            <p><strong>Guilde:</strong> {user.guild || 'Aucune'}</p>
            <p><strong>Amis:</strong> {user.friendCount || 0}</p>
            </div>
        </div>
        </div>
        
        {/* Section de héros */}
        <div className="bg-[#2f2b50] rounded-xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
            <h2 className="text-2xl font-bold text-purple-300">Collection de héros</h2>
            <p className="mt-2">Nombre total de héros: {user.heroCount || 0}</p>
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
            Voir les héros du joueur
            </button>
        </div>
        
        {/* Aperçu de quelques héros (si disponible) */}
        {user.featuredHeroes && user.featuredHeroes.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {user.featuredHeroes.map((hero, index) => (
                <div 
                key={index} 
                className="bg-[#3a3660] rounded-lg p-3 text-center cursor-pointer hover:bg-[#4a4680] transition-all"
                onClick={() => setSelectedHero(hero)}
                >
                <img 
                    src={hero.image || `/epic7-Hero/sprite-hero/${(hero.name || 'unknown').toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`}
                    alt={hero.name}
                    className="w-16 h-16 mx-auto rounded-full bg-gray-700 object-cover"
                    onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                    }}
                />
                <p className="mt-2 font-medium text-sm">{hero.name}</p>
                <p className="text-xs text-gray-300">Niv. {hero.level}</p>
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
                    className="bg-[#2f2b50] rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative z-50"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-purple-300">Héros de {user.username}</h2>
                        <button 
                            onClick={closeHeroOverlay}
                            className="bg-[#3a3660] hover:bg-[#4a4680] p-2 rounded-full"
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
                            <p className="text-xl">Aucun héro trouvé</p>
                            <p className="mt-2 text-gray-400">Ce joueur n'a pas encore de héros dans sa collection</p>
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
                    className="bg-gray-900 text-white p-4 md:p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
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
                            {selectedHero.name || selectedHero.hero?.name || 'Héros inconnu'}
                        </h2>
                        <div className="text-sm text-center mb-3">
                            🌟 {selectedHero.rarity || selectedHero.hero?.rarity} | 🔮 {selectedHero.element || selectedHero.hero?.element}
                        </div>

                        <div className="w-full max-w-[300px] aspect-[4/5] overflow-hidden flex items-center justify-center bg-[#1a1a2e] rounded-xl mb-4">
                            <img 
                                src={`/epic7-Hero/sprite-hero/${(selectedHero.name || selectedHero.hero?.name || 'unknown').toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.png`}
                                alt={selectedHero.name || selectedHero.hero?.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/epic7-Hero/sprite-hero/unknown.png';
                                }}
                            />
                        </div>

                        <div className="space-y-2 text-sm mb-4 w-full bg-[#2a2a40] p-3 rounded-lg">
                            <p>⚔️ Attaque : <span className="float-right font-bold">{selectedHero.totalAttack || selectedHero.hero?.baseAttack || '?'}</span></p>
                            <p>🛡️ Défense : <span className="float-right font-bold">{selectedHero.totalDefense || selectedHero.hero?.baseDefense || '?'}</span></p>
                            <p>💨 Vitesse : <span className="float-right font-bold">{selectedHero.totalSpeed || selectedHero.hero?.baseSpeed || '?'}</span></p>
                            <p>❤️ Santé : <span className="float-right font-bold">{selectedHero.totalHealth || selectedHero.hero?.health || '?'}</span></p>
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