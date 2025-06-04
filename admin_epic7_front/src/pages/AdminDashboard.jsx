import { useNavigate } from "react-router-dom";
import { logout } from "../services/adminAuthService"; // Assurez-vous d'avoir une fonction logout dans votre service d'authentification

function AdminDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Gestion des héros", path: "/admin/heroes" },
    { label: "Gestion des utilisateurs", path: "/admin/users" },
    { label: "Gestion des équipements", path: "/admin/equipments" },
    { label: "Ajouter un héros", path: "/admin/heroes/add" },
    { label: "Ajouter un utilisateur", path: "/admin/users/add" },
    { label: "Ajouter un équipement", path: "/admin/equipments/add" },
    { label: "Supprimmer un héros", path: "/admin/heroes/delete" },
    { label: "Supprimmer un utilisateur", path: "/admin/users/delete" },
    { label: "Supprimmer un équipement", path: "/admin/equipments/delete" }
    // Ajoutez d'autres éléments de menu selon vos besoins
  ];

  const handleLogout = () => {
    logout(); // Supprime le token
    navigate("/"); // Redirige vers la page de login
  };

  return (
    <div className="min-h-screen bg-blue-100 p-6 flex flex-col items-center justify-between">
      <div className="w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Tableau de bord Administrateur
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 transition duration-300"
            >
              <h2 className="text-xl font-semibold text-gray-700 text-center">
                {item.label}
              </h2>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 mb-6">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
