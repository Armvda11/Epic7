import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../services/authService";

// Cette route est utilisée pour protéger les routes privées
// Elle redirige vers la page de connexion si l'utilisateur n'est pas authentifié
// Si l'utilisateur est authentifié, il peut accéder à la route protégée
// On utilise le token d'authentification pour vérifier si l'utilisateur est connecté
// On utilise le hook Outlet pour rendre les composants enfants de la route
const PrivateRoute = () => {
  const isAuthenticated = !!getToken();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
