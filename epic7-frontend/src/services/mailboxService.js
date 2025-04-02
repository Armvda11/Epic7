import API from "../api/axiosInstance";

// Fonction pour récupérer les messages
export const getMessagesInfos = async () => {
try {
    const response = await API.get("/mailbox/messages");
return response.data;
} catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    throw error;
}
};

// Récupère les détails d'un message spécifique
export const getFullMessage = async (messageId) => {
try {
    const response = await API.get(`/mailbox/message/${messageId}`);
    return response.data;
}
catch (error) {
    console.error("Erreur lors de la récupération des détails du message :", error);
    throw error;
}
}

// Envoyer un message
export const sendMessage = async (messageData) => {
try {
    const response = await API.post("/mailbox/send", messageData);
    return response.data;
}
catch (error) {
    console.error("Erreur lors de l'envoi du message :", error);
    throw error;
}
}
// Supprimer un message
export const deleteMessage = async (messageId) => {
try {
    const response = await API.post(`/mailbox/delete/${messageId}`);
    return response.data;
}
catch (error) {
    console.error("Erreur lors de la suppression du message :", error);
    throw error;
}
}

// Marquer un message comme lu
export const markAsRead = async (messageId) => {
try {
    const response = await API.post(`/mailbox/read/${messageId}`);
    return response.data;
}
catch (error) {
    console.error("Erreur lors de la marque du message comme lu :", error);
    throw error;
}
}