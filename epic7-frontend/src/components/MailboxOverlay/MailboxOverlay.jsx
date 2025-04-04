import React, { useEffect, useState } from 'react';
import { useMailboxContext } from "../../context/MailboxContext";
import { motion } from "framer-motion";
import MessageItem from './MessageItem';
import { useSettings } from "../../context/SettingsContext";

const MailboxOverlay = ({ onClose }) => {
    const { messages, fetchMessages, loading, markMessageAsRead, deleteMessage } = useMailboxContext();
    const { t, language } = useSettings();
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'read', 'unread'
    const [sortBy, setSortBy] = useState('date'); // 'date', 'sender'
    
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
        
        // Mark the message as read when it's selected
        if (!message.isRead) {
            markMessageAsRead(message.id);
        }
    };

    const handleBackToList = () => {
        setSelectedMessage(null);
    };
    
    // Handler to prevent clicks on the container from closing the overlay
    const handleContainerClick = (e) => {
        e.stopPropagation();
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await deleteMessage(messageId);
            // If we're viewing this message in detail, go back to the list
            if (selectedMessage && selectedMessage.id === messageId) {
                setSelectedMessage(null);
            }
            // Refresh messages after deletion
            fetchMessages();
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    // Filter and sort messages
    const filteredAndSortedMessages = [...messages]
        .filter(message => {
            if (filter === 'all') return true;
            if (filter === 'read') return message.isRead;
            if (filter === 'unread') return !message.isRead;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
            } else if (sortBy === 'sender') {
                return a.senderName.localeCompare(b.senderName);
            }
            return 0;
        });

    if (loading && !selectedMessage) return (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-indigo-900 rounded-lg w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-lg" onClick={handleContainerClick}>
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">{t("loading", language) || "Chargement..."}</div>
            </div>
        </div>
    );

    // Pour faciliter le debug
    console.log("Messages dans le MailboxOverlay:", messages);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-indigo-900 rounded-lg w-11/12 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-lg text-gray-900 dark:text-white" onClick={handleContainerClick}>
                <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-indigo-950">
                    <h2 className="m-0 text-2xl">{t("inbox", language) || "Boîte de réception"}</h2>
                    <button className="bg-transparent border-none text-gray-700 dark:text-white text-2xl cursor-pointer" onClick={onClose}>✕</button>
                </div>

                {selectedMessage ? (
                    <>
                        <button 
                            className="bg-transparent border-none text-gray-500 dark:text-gray-400 cursor-pointer text-base py-1 px-4 text-left" 
                            onClick={handleBackToList}
                        >
                            ← {t("back", language) || "Retour"}
                        </button>
                        <MessageItem 
                            message={{
                                id: selectedMessage.id,
                                title: selectedMessage.subject,
                                content: selectedMessage.message || t("clickToSeeContent", language) || "Cliquez pour voir le contenu...",
                                sender: selectedMessage.senderName,
                                date: formatDate(selectedMessage.createdAt),
                                isRead: selectedMessage.isRead,
                                containItems: selectedMessage.containItems,
                                isFriendRequest: selectedMessage.isFriendRequest
                            }}
                            showFullMessage={true}
                            onDelete={handleDeleteMessage}
                        />
                    </>
                ) : (
                    <>
                        <div className="bg-gray-100 dark:bg-indigo-950 p-3 border-t border-gray-300 dark:border-indigo-800 flex flex-wrap gap-2 items-center">
                            <div className="flex items-center mr-4">
                                <label htmlFor="filter" className="text-sm text-gray-600 dark:text-gray-300 mr-2">{t("filter", language) || "Filtrer"}:</label>
                                <select 
                                    id="filter" 
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="bg-white dark:bg-indigo-800 text-gray-900 dark:text-white border border-gray-300 dark:border-indigo-700 rounded p-1"
                                >
                                    <option value="all">{t("all", language) || "Tous"}</option>
                                    <option value="read">{t("read", language) || "Lus"}</option>
                                    <option value="unread">{t("unread", language) || "Non lus"}</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <label htmlFor="sort" className="text-sm text-gray-600 dark:text-gray-300 mr-2">{t("sortBy", language) || "Trier par"}:</label>
                                <select 
                                    id="sort" 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-white dark:bg-indigo-800 text-gray-900 dark:text-white border border-gray-300 dark:border-indigo-700 rounded p-1"
                                >
                                    <option value="date">{t("date", language) || "Date"}</option>
                                    <option value="sender">{t("sender", language) || "Expéditeur"}</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4 flex-grow">
                            {filteredAndSortedMessages.length === 0 ? (
                                <p className="text-center p-8 text-gray-500 dark:text-gray-400">{t("noMessages", language) || "Aucun message dans votre boîte de réception"}</p>
                            ) : (
                                filteredAndSortedMessages.map((message) => (
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
                                        onDelete={handleDeleteMessage}
                                        showFullMessage={false}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MailboxOverlay;


