import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMailboxContext } from "../../context/MailboxContext";
import { acceptFriendRequest, declineFriendRequest } from "../../services/userService";
import { useSettings } from "../../context/SettingsContext";
import { retrieveItemsFromMessage } from "../../services/mailboxService";

const MessageItem = ({ message, onSelect, onDelete, showFullMessage = false }) => {
    const { getMessageDetails, markMessageAsRead } = useMailboxContext();
    const { t, language } = useSettings();
    const [detailedMessage, setDetailedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionStatus, setActionStatus] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [retrieveLoading, setRetrieveLoading] = useState(false);
    const [retrieveStatus, setRetrieveStatus] = useState(null);
    
    useEffect(() => {
        if (showFullMessage && message.id && !detailedMessage) {
            const fetchMessageDetails = async () => {
                setLoading(true);
                try {
                    if (!message.isRead) {
                        await markMessageAsRead(message.id, { handleErrorLocally: true }); // Mark as read only if not already read
                    }
                    const details = await getMessageDetails(message.id, { handleErrorLocally: true });
                    setDetailedMessage(details);
                    setError(null);
                } catch (err) {
                    console.error("Erreur lors de la récupération du message:", err);
                    setError("Impossible de charger les détails du message");
                } finally {
                    setLoading(false);
                }
            };

            fetchMessageDetails();
        }
    }, [message.id, showFullMessage, getMessageDetails, markMessageAsRead, detailedMessage]);
    
    const { id, title, content, sender, date } = message;
    
    const handleAcceptFriend = async () => {
        // Get the sender ID from the detailed message or the original message
        const senderId = detailedMessage?.data?.senderId || 
                        detailedMessage?.senderId || 
                        message.data?.senderId || 
                        message.senderId;
        
        console.log("Accept Friend - Detailed Message:", detailedMessage);
        console.log("Accept Friend - Message:", message);
        console.log("Accept Friend - Using Sender ID:", senderId);
        
        if (!senderId) {
            setError(t("missingRecipientId", language) || "Impossible de traiter cette demande: identifiant d'expéditeur manquant");
            return;
        }
        
        setActionLoading(true);
        try {
            const result = await acceptFriendRequest(senderId, { handleErrorLocally: true });
            if (result) {
                setActionStatus({
                    success: true,
                    message: t("friendRequestAccepted", language) || "Demande d'ami acceptée avec succès!"
                });
                
                // Wait 1.5 seconds then delete the message
                setTimeout(() => {
                    onDelete(message.id);
                }, 1500);
            } else {
                throw new Error(t("operationFailed", language) || "Échec de l'opération");
            }
        } catch (err) {
            console.error("Erreur lors de l'acceptation de la demande d'ami:", err);
            setActionStatus({
                success: false,
                message: t("cannotAcceptRequest", language) || "Impossible d'accepter la demande d'ami"
            });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleDeclineFriend = async () => {
        // Get the sender ID from the detailed message or the original message
        const senderId = detailedMessage?.data?.senderId || 
                        detailedMessage?.senderId || 
                        message.data?.senderId || 
                        message.senderId;
        
        console.log("Decline Friend - Detailed Message:", detailedMessage);
        console.log("Decline Friend - Message:", message);
        console.log("Decline Friend - Using Sender ID:", senderId);
        
        if (!senderId) {
            setError(t("missingRecipientId", language) || "Impossible de traiter cette demande: identifiant d'expéditeur manquant");
            return;
        }
        
        setActionLoading(true);
        try {
            const result = await declineFriendRequest(senderId, { handleErrorLocally: true });
            if (result) {
                setActionStatus({
                    success: true,
                    message: t("friendRequestDeclined", language) || "Demande d'ami refusée"
                });
                
                // Wait 1.5 seconds then delete the message
                setTimeout(() => {
                    onDelete(message.id);
                }, 1500);
            } else {
                throw new Error(t("operationFailed", language) || "Échec de l'opération");
            }
        } catch (err) {
            console.error("Erreur lors du refus de la demande d'ami:", err);
            setActionStatus({
                success: false,
                message: t("cannotDeclineRequest", language) || "Impossible de refuser la demande d'ami"
            });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleDelete = async (e) => {
        e.stopPropagation(); // Prevent triggering the onSelect handler
        
        if (deleteConfirm) {
            // Si c'est une demande d'ami, refuser automatiquement la demande avant de supprimer
            if (message.isFriendRequest) {
                console.log("Friend request message to delete - Full message data:", JSON.stringify(message, null, 2));
                
                // Try various paths to find senderId
                let senderId = null;
                
                if (detailedMessage) {
                    console.log("Detailed message available:", JSON.stringify(detailedMessage, null, 2));
                    
                    // Try to find senderId in detailed message
                    if (detailedMessage.senderId) senderId = detailedMessage.senderId;
                    else if (detailedMessage.data?.senderId) senderId = detailedMessage.data.senderId;
                    else if (detailedMessage.sender?.id) senderId = detailedMessage.sender.id;
                    else if (detailedMessage.senderInfo?.id) senderId = detailedMessage.senderInfo.id;
                }
                
                // If not found in detailedMessage, check the message object
                if (!senderId) {
                    if (message.senderId) senderId = message.senderId;
                    else if (message.data?.senderId) senderId = message.data.senderId;
                    else if (message.sender?.id) senderId = message.sender.id;
                    else if (message.senderInfo?.id) senderId = message.senderInfo.id;
                    // Try to extract from senderName if it contains numeric ID (common format: "Username (123)")
                    else if (message.senderName) {
                        const idMatch = message.senderName.match(/\((\d+)\)$/);
                        if (idMatch && idMatch[1]) {
                            senderId = parseInt(idMatch[1], 10);
                        }
                    }
                }
                
                console.log("Extracted sender ID:", senderId);
                
                // If sender ID is found, decline the friend request
                if (senderId) {
                    try {
                        setActionLoading(true);
                        console.log("Attempting to decline friend request from sender ID:", senderId);
                        
                        const result = await declineFriendRequest(senderId, { handleErrorLocally: true });
                        console.log("Friend request automatically declined when message deleted:", result);
                    } catch (err) {
                        console.error("Error automatically declining friend request:", err);
                        // Continue with deletion even if declining fails
                    } finally {
                        setActionLoading(false);
                    }
                } else {
                    // If no sender ID was found, attempt to fetch message details first
                    if (!showFullMessage && !detailedMessage) {
                        try {
                            console.log("Attempting to fetch message details to get sender ID...");
                            const details = await getMessageDetails(message.id, { handleErrorLocally: true });
                            console.log("Fetched message details:", JSON.stringify(details, null, 2));
                            
                            // Try to extract senderId from the fetched details
                            if (details.senderId) senderId = details.senderId;
                            else if (details.data?.senderId) senderId = details.data.senderId;
                            else if (details.sender?.id) senderId = details.sender.id;
                            
                            if (senderId) {
                                try {
                                    const result = await declineFriendRequest(senderId, { handleErrorLocally: true });
                                    console.log("Friend request declined after fetching details:", result);
                                } catch (declineErr) {
                                    console.error("Error declining after fetching details:", declineErr);
                                }
                            } else {
                                console.error("Still could not find sender ID after fetching details for message:", message.id);
                            }
                        } catch (fetchErr) {
                            console.error("Error fetching message details to get sender ID:", fetchErr);
                        }
                    } else {
                        console.error("Could not find sender ID to decline friend request for message:", message.id);
                    }
                }
            }
            
            // Supprimer le message
            onDelete(message.id);
            setDeleteConfirm(false);
        } else {
            setDeleteConfirm(true);
        }
    };

    const cancelDelete = (e) => {
        e.stopPropagation(); // Prevent triggering the onSelect handler
        setDeleteConfirm(false);
    };
    
    const handleRetrieveItems = async () => {
        if (!message.id) {
            setError(t("missingMessageId", language) || "Impossible de récupérer les objets: identifiant du message manquant");
            return;
        }
        
        setRetrieveLoading(true);
        try {
            const result = await retrieveItemsFromMessage(message.id, { handleErrorLocally: true });
            if (result) {
                setRetrieveStatus({
                    success: true,
                    message: t("itemsRetrievedSuccess", language) || "Objets récupérés avec succès!"
                });
                
                // Mark message as not containing items anymore
                if (detailedMessage) {
                    setDetailedMessage({
                        ...detailedMessage,
                        containItems: false,
                        shopItemIds: [] // Clear the items
                    });
                }
                
                // Wait 1.5 seconds then refresh the message details
                setTimeout(() => {
                    onSelect(message.id); // Re-trigger selection to refresh the message
                }, 1500);
            } else {
                throw new Error(t("operationFailed", language) || "Échec de l'opération");
            }
        } catch (err) {
            console.error("Erreur lors de la récupération des objets:", err);
            setRetrieveStatus({
                success: false,
                message: t("cannotRetrieveItems", language) || "Impossible de récupérer les objets"
            });
        } finally {
            setRetrieveLoading(false);
        }
    };
    
    // Pour l'affichage en mode liste
    if (!showFullMessage) {
        // Log the message for debugging
        console.log("Message status in MessageItem:", message.id, message.isRead);
        console.log("Message properties:", message.id, "isFriendRequest:", message.isFriendRequest, "containItems:", message.containItems);
        
        return (
            <motion.div
                role="button"
                tabIndex={0}
                onClick={onSelect}
                onKeyDown={(e) => e.key === "Enter" && onSelect()}
                className={`p-4 border-b border-indigo-800 dark:border-indigo-800 cursor-pointer transition-colors grid grid-cols-12 gap-2
                    ${message.isRead 
                        ? 'bg-gray-100 dark:bg-indigo-900' 
                        : 'bg-blue-50 dark:bg-indigo-700 font-semibold border-l-4 border-l-yellow-400'} 
                    ${message.containItems ? 'border-l-4 border-l-cyan-400' : ''} 
                    ${message.isFriendRequest ? 'border-l-4 border-l-purple-600' : ''} 
                    hover:bg-gray-200 dark:hover:bg-indigo-800`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="font-bold flex items-center col-span-3">
                    {message.sender}
                    {message.containItems && (
                        <span className="inline-flex items-center justify-center ml-2 text-base p-0.5 rounded-full w-6 h-6 bg-cyan-100 dark:bg-cyan-400 bg-opacity-30 dark:bg-opacity-30 text-cyan-600 dark:text-cyan-400 border border-cyan-400 shadow-sm" 
                            title={t("messageContainsItems", language) || "Ce message contient des objets"}>🎁</span>
                    )}
                    {message.isFriendRequest && (
                        <span className="inline-flex items-center justify-center ml-2 text-base p-0.5 rounded-full w-6 h-6 bg-purple-100 dark:bg-purple-600 bg-opacity-30 dark:bg-opacity-30 text-purple-600 dark:text-purple-600 border border-purple-600 shadow-sm" 
                            title={t("friendRequest", language) || "Demande d'ami"}>👥</span>
                    )}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap col-span-6">{message.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 text-right col-span-2">{message.date}</div>
                <div className="text-right col-span-1">
                    {deleteConfirm ? (
                        <div onClick={(e) => e.stopPropagation()} className="flex space-x-1">
                            <button 
                                onClick={handleDelete}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                title={t("confirmDelete", language) || "Confirmer la suppression"}
                            >
                                ✓
                            </button>
                            <button 
                                onClick={cancelDelete}
                                className="text-xs bg-gray-500 dark:bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-600 dark:hover:bg-gray-700"
                                title={t("cancel", language) || "Annuler"}
                            >
                                ✗
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleDelete}
                            className="text-xs bg-red-500 dark:bg-red-600 bg-opacity-50 dark:bg-opacity-50 text-white px-2 py-1 rounded hover:bg-red-600 dark:hover:bg-red-600"
                            title={t("deleteMessage", language) || "Supprimer le message"}
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }
    
    // Pour l'affichage du message détaillé
    return (
        <div className="p-4 flex-grow flex flex-col overflow-hidden">
            {loading ? (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">{t("loadingMessage", language) || "Chargement du message..."}</div>
            ) : error ? (
                <div className="text-center p-8 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 bg-opacity-10 dark:bg-opacity-10 rounded-md my-4">{error}</div>
            ) : (
                <div className="overflow-y-auto pr-1 flex-grow">
                    <div className="mb-4 border-b border-gray-300 dark:border-indigo-800 pb-4 flex justify-between items-start">
                        <div>
                            <h3 className="mt-0 mb-2.5 text-xl">{detailedMessage?.subject || message.title}</h3>
                            <p>{t("from", language) || "De"}: <strong>{detailedMessage?.senderName || message.sender}</strong></p>
                            <p>{t("receivedOn", language) || "Reçu le"}: {detailedMessage?.createdAt ? new Date(detailedMessage.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : message.date}</p>
                        </div>
                        <div>
                            {deleteConfirm ? (
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={handleDelete}
                                        className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
                                    >
                                        {t("confirm", language) || "Confirmer"}
                                    </button>
                                    <button 
                                        onClick={cancelDelete}
                                        className="bg-gray-500 dark:bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-600 dark:hover:bg-gray-700"
                                    >
                                        {t("cancel", language) || "Annuler"}
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setDeleteConfirm(true)}
                                    className="bg-red-500 dark:bg-red-600 bg-opacity-50 dark:bg-opacity-50 text-white px-3 py-2 rounded hover:bg-red-600 dark:hover:bg-red-600"
                                >
                                    {t("delete", language) || "Supprimer"}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="leading-relaxed space-y-4">
                        <div className="border border-gray-300 dark:border-indigo-800 rounded-md p-4 bg-gray-50 dark:bg-indigo-950 bg-opacity-50 dark:bg-opacity-50 shadow-inner">
                            <p className="whitespace-pre-wrap">{detailedMessage?.message || message.content || t("noContent", language) || "Aucun contenu"}</p>
                        </div>
                        
                        {(detailedMessage?.containItems || message.containItems) && (
                            <div className="p-2 bg-cyan-100 dark:bg-cyan-900 bg-opacity-20 dark:bg-opacity-10 rounded-md border-l-4 border-l-cyan-400">
                                <p>{t("messageContainsItems", language) || "Ce message contient des objets."}</p>
                                {detailedMessage?.shopItemIds && detailedMessage.shopItemIds.length > 0 && (
                                    <div className="mt-2">
                                        <p className="font-semibold">{t("itemIds", language) || "IDs des objets"}:</p>
                                        <ul className="list-disc ml-5">
                                            {detailedMessage.shopItemIds.map((itemId, index) => (
                                                <li key={index} className="text-cyan-700 dark:text-cyan-400">
                                                    {itemId}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div className="mt-3">
                                    <button 
                                        onClick={handleRetrieveItems}
                                        disabled={retrieveLoading}
                                        className={`py-2 px-4 bg-cyan-600 text-white font-bold rounded-md border-none ${retrieveLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-cyan-700'}`}
                                    >
                                        {retrieveLoading 
                                            ? t("retrievingItems", language) || 'Récupération en cours...' 
                                            : t("retrieveItems", language) || 'Récupérer les objets'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {(detailedMessage?.isFriendRequest || message.isFriendRequest) && !actionStatus?.success && (
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 bg-opacity-20 dark:bg-opacity-10 rounded-md border-l-4 border-l-purple-600">
                                <p>{t("messageIsFriendRequest", language) || "Ce message est une demande d'ami."}</p>
                                <div className="flex gap-4 mt-2">
                                    <button 
                                        onClick={handleAcceptFriend}
                                        disabled={actionLoading}
                                        className={`py-2 px-4 bg-green-600 text-white font-bold rounded-md border-none ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {actionLoading ? t("inProgress", language) || 'En cours...' : t("accept", language) || 'Accepter'}
                                    </button>
                                    <button 
                                        onClick={handleDeclineFriend}
                                        disabled={actionLoading}
                                        className={`py-2 px-4 bg-red-600 text-white font-bold rounded-md border-none ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {actionLoading ? t("inProgress", language) || 'En cours...' : t("decline", language) || 'Refuser'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {actionStatus?.success && (
                            <div className="p-2 bg-green-100 dark:bg-green-900 bg-opacity-20 dark:bg-opacity-10 rounded-md border-l-4 border-l-green-600 text-green-700 dark:text-green-400">
                                {actionStatus.message}
                            </div>
                        )}
                        
                        {retrieveStatus?.success && (
                            <div className="p-2 bg-green-100 dark:bg-green-900 bg-opacity-20 dark:bg-opacity-10 rounded-md border-l-4 border-l-green-600 text-green-700 dark:text-green-400">
                                {retrieveStatus.message}
                            </div>
                        )}
                        
                        {retrieveStatus?.success === false && (
                            <div className="p-2 bg-red-100 dark:bg-red-900 bg-opacity-20 dark:bg-opacity-10 rounded-md border-l-4 border-l-red-600 text-red-700 dark:text-red-400">
                                {retrieveStatus.message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageItem;
