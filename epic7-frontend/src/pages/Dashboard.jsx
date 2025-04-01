// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import { fetchUserProfile } from "../services/userService";
import { useSettings } from "../context/SettingsContext";
import MenuTile from "../components/MenuTile";
import ProfileCard from "../components/ProfileCard";
import SettingsPanel from "../components/settings/SettingsPanel";
import MailboxOverlay from "../components/MailboxOverlay/MailboxOverlay";

import { FaUserFriends, FaUsers, FaMagic,FaCrosshairs, FaBookOpen, FaBoxOpen} from "react-icons/fa";

// Cette page affiche le tableau de bord de l'utilisateur
// Elle affiche les informations de l'utilisateur, un menu de navigation
// et un bouton de déconnexion
// Elle utilise le service d'authentification pour gérer la connexion et la déconnexion
// Elle utilise le service utilisateur pour récupérer les informations de l'utilisateur
const Dashboard = () => {
  const navigate = useNavigate();
  const { language, t } = useSettings(); // Langue & Traductions
  const [user, setUser] = useState(null);  // inormations de l'utilisateur
  const [showProfile, setShowProfile] = useState(false); // État pour afficher la carte de profil
  const [showSettings, setShowSettings] = useState(false); // État pour afficher le panneau de paramètres
  const [showMailbox, setShowMailbox] = useState(false); // État pour afficher la mailbox

  //  Chargement des infos utilisateur
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile(); // Récupération des données utilisateur
        setUser(data); // Mise à jour de l'état avec les données utilisateur
      } catch (error) {console.error("Failed to load user profile:", error);}
    };
    loadUser();
  }, []);

  // Fonction pour gérer la déconnexion
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { label: t("inventory", language), icon: <FaBoxOpen size={28} />, action: () => navigate("/inventory") },
    { label: t("myHeroes", language), icon: <FaMagic size={28} />, action: () => navigate("/my-heroes") },
    { label: t("friends", language), icon: <FaUserFriends size={28} /> },
    { label: t("guilds", language), icon: <FaUsers size={28} /> },
    { label: t("quests", language), icon: <FaBookOpen size={28} /> },
    { label: t("battle", language), icon: <FaCrosshairs size={28} /> },
  ];
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white">
        {t("loadingProfile", language)}...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white p-6 relative">

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


      {/*  Carte de profil flottante */}
      {showProfile && <ProfileCard user={user} onClose={() => setShowProfile(false)} />}

      {/*  Mini carte profil */}
      <header className="flex justify-end mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowMailbox(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-10" 
            aria-label="Ouvrir la boîte de réception"
          >
            <span className="text-2xl">📬</span>
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="w-full max-w-xs p-4 bg-[#2f2b50] rounded-xl shadow-xl hover:ring-2 ring-purple-400 transition text-left"
          >
            <article className="flex items-center gap-4">
              <img src="/epic7-Hero/sprite-hero/mavuika.png" alt="avatar" className="w-14 h-14 rounded-full bg-gray-600 object-cover shadow"
                  onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/epic7-Hero/sprite-hero/unknown.png";
                }}
              />
              <div>
                <h2 className="text-xl font-bold">{user.username}</h2>
                <p className="text-sm text-gray-300">{t("level", language)} {user.level}</p>
              </div>
            </article>

            <aside className="mt-4 grid grid-cols-3 gap-2 text-sm text-center">
              <p className="bg-statBg p-2 rounded-lg">💰 {user.gold}</p>
              <p className="bg-statBg p-2 rounded-lg">💎 {user.diamonds}</p>
              <p className="bg-statBg p-2 rounded-lg">⚡ {user.energy}</p>
            </aside>
          </button>
        </div>
      </header>

      {/*  Titre d'accueil */}
      <section className="text-center mb-10">
        <h1 className="text-3xl font-bold">
          {t("welcome", language)}, <span className="text-purple-300">{user.username}</span>
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
