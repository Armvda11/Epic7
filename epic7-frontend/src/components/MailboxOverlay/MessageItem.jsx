import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMailboxContext } from "../../context/MailboxContext";
import { acceptFriendRequest, declineFriendRequest } from "../../services/userService";

const MessageItem = ({ message, onSelect, showFullMessage = false }) => {
    const { getMessageDetails, markMessageAsRead } = useMailboxContext();
    const [detailedMessage, setDetailedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionStatus, setActionStatus] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    useEffect(() => {
        // Si on doit afficher le message complet, on récupère les détails
        if (showFullMessage && message.id) {
            const fetchMessageDetails = async () => {
                setLoading(true);
                try {
                    await markMessageAsRead(message.id);
                    const details = await getMessageDetails(message.id);
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
    }, [message.id, showFullMessage, getMessageDetails, markMessageAsRead]);
    
    const { id, title, content, sender, date } = message;
    
    const handleAcceptFriend = async () => {
        if (!detailedMessage?.senderId && !message.senderId) {
            setError("Impossible de traiter cette demande: identifiant d'expéditeur manquant");
            return;
        }
        
        const senderId = detailedMessage?.senderId || message.senderId;
        setActionLoading(true);
        try {
            const result = await acceptFriendRequest(senderId);
            if (result) {
                setActionStatus({
                    success: true,
                    message: "Demande d'ami acceptée avec succès!"
                });
            } else {
                throw new Error("Échec de l'opération");
            }
        } catch (err) {
            console.error("Erreur lors de l'acceptation de la demande d'ami:", err);
            setActionStatus({
                success: false,
                message: "Impossible d'accepter la demande d'ami"
            });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleDeclineFriend = async () => {
        if (!detailedMessage?.senderId && !message.senderId) {
            setError("Impossible de traiter cette demande: identifiant d'expéditeur manquant");
            return;
        }
        
        const senderId = detailedMessage?.senderId || message.senderId;
        setActionLoading(true);
        try {
            const result = await declineFriendRequest(senderId);
            if (result) {
                setActionStatus({
                    success: true,
                    message: "Demande d'ami refusée"
                });
            } else {
                throw new Error("Échec de l'opération");
            }
        } catch (err) {
            console.error("Erreur lors du refus de la demande d'ami:", err);
            setActionStatus({
                success: false,
                message: "Impossible de refuser la demande d'ami"
            });
        } finally {
            setActionLoading(false);
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
                className={`p-4 border-b border-indigo-800 cursor-pointer transition-colors grid grid-cols-4 gap-2
                    ${message.isRead ? 'bg-indigo-900' : 'bg-indigo-700 font-semibold border-l-4 border-l-yellow-400'} 
                    ${message.containItems ? 'border-l-4 border-l-cyan-400' : ''} 
                    ${message.isFriendRequest ? 'border-l-4 border-l-purple-600' : ''} 
                    hover:bg-indigo-800`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="font-bold flex items-center">
                    {message.sender}
                    {message.containItems && (
                        <span className="inline-flex items-center justify-center ml-2 text-base p-0.5 rounded-full w-6 h-6 bg-cyan-400 bg-opacity-30 text-cyan-400 border border-cyan-400 shadow-sm" 
                            title="Ce message contient des objets">🎁</span>
                    )}
                    {message.isFriendRequest && (
                        <span className="inline-flex items-center justify-center ml-2 text-base p-0.5 rounded-full w-6 h-6 bg-purple-600 bg-opacity-30 text-purple-600 border border-purple-600 shadow-sm" 
                            title="Demande d'ami">👥</span>
                    )}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap col-span-2">{message.title}</div>
                <div className="text-sm text-gray-400 text-right">{message.date}</div>
            </motion.div>
        );
    }
    
    // Pour l'affichage du message détaillé
    return (
        <div className="p-4 overflow-y-auto">
            {loading ? (
                <div className="text-center p-8 text-gray-400">Chargement du message...</div>
            ) : error ? (
                <div className="text-center p-8 text-red-400 bg-red-900 bg-opacity-10 rounded-md my-4">{error}</div>
            ) : (
                <>
                    <div className="mb-4 border-b border-indigo-800 pb-4">
                        <h3 className="mt-0 mb-2.5 text-xl">{detailedMessage?.subject || message.title}</h3>
                        <p>De: <strong>{detailedMessage?.senderName || message.sender}</strong></p>
                        <p>Reçu le: {detailedMessage?.createdAt ? new Date(detailedMessage.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : message.date}</p>
                    </div>
                    <div className="leading-relaxed">
                        <p>{detailedMessage?.message || message.content || "Aucun contenu"}</p>
                        
                        {(detailedMessage?.containItems || message.containItems) && (
                            <div className="mt-4 p-2 bg-cyan-400 bg-opacity-10 rounded-md border-l-4 border-l-cyan-400">
                                <p>Ce message contient des objets.</p>
                            </div>
                        )}
                        
                        {(detailedMessage?.isFriendRequest || message.isFriendRequest) && !actionStatus?.success && (
                            <div className="mt-4 p-2 bg-purple-600 bg-opacity-10 rounded-md border-l-4 border-l-purple-600">
                                <p>Ce message est une demande d'ami.</p>
                                {actionStatus && !actionStatus.success && (
                                    <div className="mt-2 p-2 bg-red-600 bg-opacity-10 rounded-md text-red-400">
                                        {actionStatus.message}
                                    </div>
                                )}
                                <div className="flex gap-4 mt-2">
                                    <button 
                                        onClick={handleAcceptFriend}
                                        disabled={actionLoading}
                                        className={`py-2 px-4 bg-green-600 text-white font-bold rounded-md border-none ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {actionLoading ? 'En cours...' : 'Accepter'}
                                    </button>
                                    <button 
                                        onClick={handleDeclineFriend}
                                        disabled={actionLoading}
                                        className={`py-2 px-4 bg-red-600 text-white font-bold rounded-md border-none ${actionLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {actionLoading ? 'En cours...' : 'Refuser'}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {actionStatus?.success && (
                            <div className="mt-4 p-2 bg-green-600 bg-opacity-10 rounded-md border-l-4 border-l-green-600 text-green-400">
                                {actionStatus.message}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MessageItem;
