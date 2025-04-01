import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMailboxContext } from "../../context/MailboxContext";

const MessageItem = ({ message, onSelect, showFullMessage = false }) => {
    const { getMessageDetails, markMessageAsRead } = useMailboxContext();
    const [detailedMessage, setDetailedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
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
    
    // Pour l'affichage en mode liste
    if (!showFullMessage) {
        return (
            <motion.div
                role="button"
                tabIndex={0}
                onClick={onSelect}
                onKeyDown={(e) => e.key === "Enter" && onSelect()}
                className={`message-item 
                    ${!message.read ? 'unread' : ''} 
                    ${message.containsItems ? 'has-items' : ''} 
                    ${message.isFriendRequest ? 'friend-request' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className="message-sender">
                    {message.sender}
                    {message.containsItems && <span className="message-indicator indicator-items">🎁</span>}
                    {message.isFriendRequest && <span className="message-indicator indicator-friend">👥</span>}
                </div>
                <div className="message-subject">{message.title}</div>
                <div className="message-date">{message.date}</div>
            </motion.div>
        );
    }
    
    // Pour l'affichage du message détaillé
    return (
        <div className="message-detail">
            {loading ? (
                <div className="message-loading">Chargement du message...</div>
            ) : error ? (
                <div className="message-error">{error}</div>
            ) : (
                <>
                    <div className="message-header">
                        <h3>{detailedMessage?.subject || title}</h3>
                        <p>De: <strong>{detailedMessage?.senderName || sender}</strong></p>
                        <p>Reçu le: {detailedMessage?.createdAt ? new Date(detailedMessage.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : date}</p>
                    </div>
                    <div className="message-content">
                        {/* Utiliser message au lieu de content car c'est le nom de la propriété dans le DTO */}
                        <p>{detailedMessage?.message || content || "Aucun contenu"}</p>
                        
                        {/* Afficher les informations supplémentaires si présentes */}
                        {detailedMessage?.containItems && (
                            <div className="message-items-info">
                                <p>Ce message contient des objets.</p>
                            </div>
                        )}
                        
                        {detailedMessage?.isFriendRequest && (
                            <div className="message-friend-request">
                                <p>Ce message est une demande d'ami.</p>
                                <div className="friend-request-actions">
                                    <button className="accept-button">Accepter</button>
                                    <button className="reject-button">Refuser</button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MessageItem;