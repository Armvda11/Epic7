import axios from "axios";
import { getToken, logout } from "../services/authService";
import { createRoot } from "react-dom/client";
import Notification from "../components/common/Notification";
import React from "react";

// Create a notification container if it doesn't exist
const setupNotificationContainer = () => {
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }
  return container;
};

// Show notification using our custom component
const showNotification = (message, type = "error", duration = 5000) => {
  const container = setupNotificationContainer();
  const notificationId = `notification-${Date.now()}`;
  
  const notificationElement = document.createElement("div");
  notificationElement.id = notificationId;
  container.appendChild(notificationElement);
  
  const root = createRoot(notificationElement);
  
  root.render(
    <Notification 
      message={message} 
      type={type} 
      duration={duration}
      onClose={() => {
        root.unmount();
        notificationElement.remove();
      }}
    />
  );
  
  return notificationId;
};

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
  
  // Allow components to skip global error handling
  if (config.skipGlobalErrorHandling === undefined) {
    config.skipGlobalErrorHandling = false;
  }
  
  return config;
});

// Intercepteur de réponse : gère l'erreur 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip global error handling if specified in the request config
    if (error.config?.skipGlobalErrorHandling) {
      return Promise.reject(error);
    }

    // Check if it's a ResponseDTO error format
    const errorData = error.response?.data;
    const isResponseDTO = errorData && typeof errorData === 'object' && 
                          'success' in errorData && 'code' in errorData && 'message' in errorData;
    
    // Gestion des erreurs CORS
    if (
      (!error.response || error.response?.status === 0) && 
      (error.message.includes('CORS') || error.message.includes('Cross-Origin'))
    ) {
      console.error("Erreur CORS. Déconnexion de l'utilisateur...");
      showNotification("Problème de connexion au serveur. Déconnexion...");
      logout();
      window.location.href = "/"; // redirection vers login
      return Promise.reject(error);
    }

    switch (error.response?.status) {
      case 401:
        console.error("Erreur 401 | Token invalide ou expiré. Déconnexion de l'utilisateur...");
        showNotification("Session expirée. Veuillez vous reconnecter.");
        logout();
        window.location.href = "/"; // redirection vers login
        break;
      case 403:
        if (!error.config?.skipForbiddenHandler) {
          console.error("Erreur 403 | Accès interdit");
          
          // Create custom buttons for 403 error
          const message = (
            <div>
              <p>Accès interdit</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    logout();
                    window.location.href = "/";
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Reconnexion
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/dashboard";
                  }}
                  className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Dashboard
                </button>
              </div>
            </div>
          );
          
          showNotification(message, "error", 10000);
        }
        break;
      case 500:
        console.error("Erreur 500 | Erreur interne du serveur");
        if (isResponseDTO) {
          showNotification(errorData.message || "Erreur interne du serveur", "error");
        } else {
          showNotification("Une erreur est survenue côté serveur", "error");
        }
        break;
      case 400:
        console.error("Erreur 400 | Requête incorrecte");
        if (isResponseDTO) {
          showNotification(errorData.message || "Requête incorrecte", "error");
        } else {
          showNotification("Requête incorrecte", "error");
        }
        break;
      default:
        // Don't show notification for handled status codes
        if (![401, 403].includes(error.response?.status)) {
          console.error(`Erreur ${error.response?.status || 'réseau'} | ${error.message}`);
          if (isResponseDTO) {
            showNotification(errorData.message || "Une erreur est survenue", "error");
          } else {
            showNotification("Une erreur est survenue lors de la communication avec le serveur", "error");
          }
        }
        break;
    }

    return Promise.reject(error);
  }
);

export default API;