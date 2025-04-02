import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
getMessagesInfos, 
getFullMessage, 
sendMessage, 
deleteMessage, 
markAsRead 
} from '../services/mailboxService';

// Create the context
const MailboxContext = createContext();

// Custom hook to use the mailbox context
export const useMailboxContext = () => {
const context = useContext(MailboxContext);
if (!context) {
    throw new Error('useMailboxContext must be used within a MailboxProvider');
}
return context;
};

// Provider component
export const MailboxProvider = ({ children }) => {
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Function to fetch messages
const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
    const fetchedMessages = await getMessagesInfos();
    console.log('Messages from API:', fetchedMessages); // Debug what's coming from the API
    setMessages(fetchedMessages);
    setLoading(false);
    } catch (error) {
    console.error('Error fetching messages:', error);
    setError('Impossible de récupérer les messages');
    setLoading(false);
    }
}, []);

// Function to get details for a specific message
const getMessageDetails = useCallback(async (messageId, options = {}) => {
    setLoading(true);
    try {
    const messageDetails = await getFullMessage(messageId, options);
    setLoading(false);
    return messageDetails;
    } catch (error) {
    console.error('Error fetching message details:', error);
    setError('Impossible de récupérer les détails du message');
    setLoading(false);
    throw error;
    }
}, []);

// Function to send a new message
const sendNewMessage = useCallback(async (messageData) => {
    setLoading(true);
    try {
    const result = await sendMessage(messageData);
    fetchMessages(); // Refresh the messages list
    setLoading(false);
    return result;
    } catch (error) {
    console.error('Error sending message:', error);
    setError('Impossible d\'envoyer le message');
    setLoading(false);
    throw error;
    }
}, [fetchMessages]);

// Function to delete a message
const removeMessage = useCallback(async (messageId) => {
    setLoading(true);
    try {
    await deleteMessage(messageId);
    setMessages(prevMessages => prevMessages.filter(message => message.id !== messageId));
    setLoading(false);
    } catch (error) {
    console.error('Error deleting message:', error);
    setError('Impossible de supprimer le message');
    setLoading(false);
    throw error;
    }
}, []);

// Function to mark a message as read
const markMessageAsRead = useCallback(async (messageId, options = {}) => {
    try {
    await markAsRead(messageId, options);
    setMessages(prevMessages => 
        prevMessages.map(message => 
        message.id === messageId ? { ...message, isRead: true } : message
        )
    );
    } catch (error) {
    console.error('Error marking message as read:', error);
    setError('Impossible de marquer le message comme lu');
    throw error;
    }
}, []);

const value = {
    messages,
    loading,
    error,
    fetchMessages,
    getMessageDetails,
    sendNewMessage,
    removeMessage,
    markMessageAsRead
};

return (
    <MailboxContext.Provider value={value}>
    {children}
    </MailboxContext.Provider>
);
};