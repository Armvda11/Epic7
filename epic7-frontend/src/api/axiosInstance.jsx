import axios from "axios";
import { getToken, logout } from "../services/authService";
import { toast } from "react-toastify"; // Ajout de l'import manquant pour toast

// Création d'une instance Axios
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur de requête : ajoute le token
API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur de réponse : gère l'erreur 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Traitement spécial pour les erreurs 403 uniquement
    if (error.response?.status === 403 && error.config?.useGlobalErrorHandler !== true) {
      console.log("Erreur 403 gérée localement (comportement par défaut pour les 403)");
      return Promise.reject(error);
    }
  
    // Gestion des erreurs CORS
    if (
      (!error.response || error.response?.status === 0) && 
      (error.message.includes('CORS') || error.message.includes('Cross-Origin'))
    ) {
      console.error("Erreur CORS. Déconnexion de l'utilisateur...");
      toast.error("Problème de connexion au serveur. Déconnexion...");
      logout();
      window.location.href = "/"; // redirection vers login
      return Promise.reject(error);
    }

    switch (error.response?.status) {
      case 401:
      console.error("Erreur 401 | Token invalide ou expiré. Déconnexion de l'utilisateur...");
      toast.error("Erreur 401 | Token invalide ou expiré. Déconnexion...");
      logout();
      window.location.href = "/"; // redirection vers login
      break;
      case 403:
      // Affiche seulement si useGlobalErrorHandler est explicitement défini à true
      if (error.config?.useGlobalErrorHandler === true) {
        console.error("Erreur 403 | Accès interdit");
        console.log("Tentative d'affichage du toast 403...");
        
        toast.error(
          <div style={{ textAlign: "center" }}>
            <p>Erreur 403 | Accès interdit</p>
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => {
                  logout();
                  window.location.href = "/";
                }}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  color: "#007bff",
                  cursor: "pointer",
                }}
              >
                Reconnectez-vous
              </button>
              <button
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  color: "#007bff",
                  cursor: "pointer",
                }}
              >
                Retour
              </button>
              <button
                onClick={() => {
                  toast.dismiss();
                }}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  color: "#6c757d",
                  cursor: "pointer",
                }}
              >
                Ignorer
              </button>
            </div>
          </div>,
          { 
            autoClose: false,
            closeOnClick: true,
            position: "top-center",
            className: "overlay-toast",
            style: { backgroundColor: "rgba(255,255,255,0.9)" }
          }
        );
        console.log("Toast 403 envoyé");
      }
      break;
      case 500:
      console.error("Erreur 500 | Erreur interne du serveur");
      break;
      case 404:
      console.error("Erreur 404 | Ressource non trouvée");
      break;
      case 400:
      console.error("Erreur 400 | Requête incorrecte");
      toast.error("Erreur 400 | Requête incorrecte");
      break;
      case 409:
      console.error("Erreur 409 | Conflit de ressources");
      break;
      case 422:
      console.error("Erreur 422 | Erreur de validation des données");
      break;
      case 429:
      console.error("Erreur 429 | Trop de requêtes envoyées");
      break;
      case 503:
      console.error("Erreur 503 | Service indisponible");
      break;
      case 504:
      console.error("Erreur 504 | Délai d'attente de la passerelle dépassé");
      break;
      default:
      console.error("Erreur " + error.response?.status + " | Erreur inconnue");
      // Affichage d'un message d'erreur générique
      toast.error("Une erreur inconnue est survenue. Veuillez réessayer.");
      break;
    }

    return Promise.reject(error);
  }
);

export default API;