import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout, getToken } from "../services/authService";
import { fetchUserProfile } from "../services/userService";

function Dashboard() {
  const navigate = useNavigate();
  const token = getToken();

  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUserProfile();
        setUser(data);
      } catch (error) {
        console.error("Erreur lors du chargement du profil utilisateur");
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user) return <div className="text-white p-6">Chargement du profil...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b3a] to-[#2a2250] text-white p-6 relative">

      {/* Carte profil flottante */}
      {showProfile && (
        <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#2a2442] p-6 rounded-xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-2 right-4 text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-500 rounded-full mb-4"></div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-sm text-gray-300 mb-4">Niveau {user.level}</p>
              <div className="grid grid-cols-3 gap-4 text-center text-sm w-full">
                <div className="bg-[#403a6b] p-3 rounded-lg">💰 {user.gold}</div>
                <div className="bg-[#403a6b] p-3 rounded-lg">💎 {user.diamonds}</div>
                <div className="bg-[#403a6b] p-3 rounded-lg">⚡ 80 / 100</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Profil en haut à droite */}
      <div className="flex justify-end mb-6">
        <div
          onClick={() => setShowProfile(true)}
          className="bg-[#2f2b50] p-4 rounded-xl shadow-xl w-full max-w-xs cursor-pointer hover:ring-2 ring-purple-400 transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-500 rounded-full" />
            <div>
              <h2 className="text-xl font-bold">{user.username}</h2>
              <p className="text-sm text-gray-300">Niveau {user.level}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 text-center text-sm gap-2">
            <div className="bg-[#403a6b] p-2 rounded-lg">💰 {user.gold}</div>
            <div className="bg-[#403a6b] p-2 rounded-lg">💎 {user.diamonds}</div>
            <div className="bg-[#403a6b] p-2 rounded-lg">⚡ 80 / 100</div>
          </div>
        </div>
      </div>

      {/* Menu principal */}
      <h1 className="text-3xl font-bold text-center mb-6">Bienvenue dans ton Dashboard Epic7</h1>

      <div className="p-4">
      <button
        onClick={() => navigate('/my-heroes')}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Voir mes héros
      </button>
    </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        {[
          { label: 'Personnages', icon: '🧝' },
          { label: 'Guilde', icon: '🏰' },
          { label: 'Invocation', icon: '✨' },
          { label: 'Arène', icon: '⚔️' },
          { label: 'Histoire', icon: '📜' },
          { label: 'Inventaire', icon: '🎒' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-[#332c56] hover:bg-[#4a3f78] transition p-6 rounded-xl shadow-lg flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="text-4xl mb-2">{item.icon}</div>
            <div className="text-lg font-semibold">{item.label}</div>
          </div>
        ))}
      </div>

      

      {/* Déconnexion et token */}
      <div className="mt-10 text-center">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>

    
  );
}

export default Dashboard;
