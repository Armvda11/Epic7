import React, { useEffect, useState } from 'react';
import { useMailboxContext } from "../../context/MailboxContext";
import { motion } from "framer-motion";
import MessageItem from './MessageItem';

const MailboxOverlay = ({ onClose }) => {
    const { messages, fetchMessages, loading } = useMailboxContext();
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    // Refresh messages when the component mounts and when it becomes visible
    useEffect(() => {
        fetchMessages();
        setIsVisible(true);
        
        // Refresh messages on component unmount and remount
        return () => {
            setIsVisible(false);
        };
    }, [fetchMessages]);

    // This ensures messages are refreshed each time the overlay opens
    useEffect(() => {
        if (isVisible) {
            fetchMessages();
        }
    }, [isVisible, fetchMessages]);

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
    
    // Handler to prevent clicks on the container from closing the overlay
    const handleContainerClick = (e) => {
        e.stopPropagation();
    };

    if (loading && !selectedMessage) return (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-indigo-900 rounded-lg w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-lg" onClick={handleContainerClick}>
                <div className="text-center p-8 text-gray-400">Chargement...</div>
            </div>
        </div>
    );

    // Pour faciliter le debug
    console.log("Messages dans le MailboxOverlay:", messages);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-indigo-900 rounded-lg w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-lg" onClick={handleContainerClick}>
                <div className="flex justify-between items-center p-4 bg-indigo-950 text-white">
                    <h2 className="m-0 text-2xl">Boîte de réception</h2>
                    <button className="bg-transparent border-none text-white text-2xl cursor-pointer" onClick={onClose}>✕</button>
                </div>

                {selectedMessage ? (
                    <div>
                        <button className="bg-transparent border-none text-gray-400 mb-4 cursor-pointer text-base p-4" onClick={handleBackToList}>← Retour</button>
                        <MessageItem 
                            message={{
                                id: selectedMessage.id,
                                title: selectedMessage.subject,
                                content: selectedMessage.message || "Cliquez pour voir le contenu...",
                                sender: selectedMessage.senderName,
                                date: formatDate(selectedMessage.createdAt),
                                isRead: selectedMessage.isRead,
                                containItems: selectedMessage.containItems,
                                isFriendRequest: selectedMessage.isFriendRequest
                            }}
                            showFullMessage={true}
                        />
                    </div>
                ) : (
                    <div className="overflow-y-auto p-4 flex-grow">
                        {messages.length === 0 ? (
                            <p className="text-center p-8 text-gray-400">Aucun message dans votre boîte de réception</p>
                        ) : (
                            messages.map((message) => (
                                <MessageItem
                                    key={message.id}
                                    message={{
                                        id: message.id,
                                        title: message.subject,
                                        content: message.message || "",
                                        sender: message.senderName,
                                        date: formatDate(message.createdAt),
                                        isRead: message.isRead,
                                        containItems: message.containItems,
                                        isFriendRequest: message.isFriendRequest
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


