import React, { useEffect, useState } from 'react';
import { useMailboxContext } from "../../context/MailboxContext";
import MessageItem from './MessageItem';
import './MailboxOverlay.css';

const MailboxOverlay = ({ onClose }) => {
    const { messages, fetchMessages, loading } = useMailboxContext();
    const [selectedMessage, setSelectedMessage] = useState(null);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleMessageClick = (message) => {
        setSelectedMessage(message);
    };

    const handleBackToList = () => {
        setSelectedMessage(null);
    };

    if (loading && !selectedMessage) return (
        <div className="mailbox-overlay">
            <div className="mailbox-container">
                <div className="mailbox-loading">Chargement...</div>
            </div>
        </div>
    );

    return (
        <div className="mailbox-overlay">
            <div className="mailbox-container">
                <div className="mailbox-header">
                    <h2>Boîte de réception</h2>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                {selectedMessage ? (
                    <div>
                        <button className="back-button" onClick={handleBackToList}>← Retour</button>
                        <MessageItem 
                            message={{
                                id: selectedMessage.id,
                                title: selectedMessage.subject,
                                // Ajout du 'message' comme fallback si content n'existe pas
                                content: selectedMessage.preview || selectedMessage.message || "Cliquez pour voir le contenu...",
                                sender: selectedMessage.senderName,
                                date: formatDate(selectedMessage.createdAt)
                            }}
                            showFullMessage={true}
                        />
                    </div>
                ) : (
                    <div className="messages-list">
                        {messages.length === 0 ? (
                            <p className="no-messages">Aucun message dans votre boîte de réception</p>
                        ) : (
                            messages.map((message) => (
                                <MessageItem 
                                    key={message.id}
                                    message={{
                                        id: message.id,
                                        title: message.subject,
                                        // Utiliser message si preview n'existe pas
                                        content: message.preview || message.message?.substring(0, 50) + "..." || "Cliquez pour voir le contenu...",
                                        sender: message.senderName,
                                        date: formatDate(message.createdAt)
                                    }}
                                    onSelect={() => handleMessageClick(message)}
                                    showFullMessage={false}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MailboxOverlay;


