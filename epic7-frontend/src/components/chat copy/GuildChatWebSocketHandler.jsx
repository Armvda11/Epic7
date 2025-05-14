import React from 'react';
import { useEffect, useRef } from 'react';
import ChatWebSocketService from '../../services/ChatWebSocketService';

/**
 * GuildChatWebSocketHandler - Component to handle WebSocket connections for guild chat
 * This component doesn't render anything, it just manages guild chat WebSocket subscriptions
 */
const GuildChatWebSocketHandler = ({ guildId, onMessage, onDeleteMessage }) => {
  const subscriptionsRef = useRef({
    message: null,
    delete: null
  });
  
  // Set up WebSocket listeners when the component mounts
  useEffect(() => {
    if (!guildId) return;
    
    console.log(`[GuildChatWebSocketHandler] Setting up WebSocket handlers for guild ${guildId}`);
    
    // Connect to WebSocket if not already connected
    const setupSubscriptions = async () => {
      // Ensure we're connected
      if (!ChatWebSocketService.isConnected()) {
        try {
          console.log(`[GuildChatWebSocketHandler] Connecting to WebSocket`);
          await ChatWebSocketService.connect();
          console.log(`[GuildChatWebSocketHandler] Connected to WebSocket successfully`);
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Failed to connect to WebSocket:`, error);
          // Try to reconnect once after a delay
          setTimeout(async () => {
            try {
              console.log(`[GuildChatWebSocketHandler] Attempting to reconnect...`);
              await ChatWebSocketService.connect();
              console.log(`[GuildChatWebSocketHandler] Reconnected successfully`);
              // Set up subscriptions after reconnect
              createSubscriptions();
            } catch (reconnectError) {
              console.error(`[GuildChatWebSocketHandler] Reconnection failed:`, reconnectError);
            }
          }, 2000);
          return; // Exit early, we'll try again after reconnect
        }
      }
      
      createSubscriptions();
    };
    
    const createSubscriptions = () => {
      if (ChatWebSocketService.isConnected()) {
        // Clean up any existing subscriptions first
        cleanupSubscriptions();
        
        // Subscribe to guild chat messages with explicit destination path
        console.log(`[GuildChatWebSocketHandler] Subscribing to guild chat for guild ${guildId}`);
        try {
          subscriptionsRef.current.message = ChatWebSocketService.subscribeToGuildChat(guildId, (data) => {
            console.log(`[GuildChatWebSocketHandler] Received guild message:`, data);
            
            // Ensure the message has the guildId property
            const enhancedData = {
              ...data,
              guildId: data.guildId || guildId,
              chatType: data.chatType || 'GUILD'
            };
            
            // Forward to parent component
            if (onMessage) {
              onMessage(enhancedData);
            }
          });
          
          if (!subscriptionsRef.current.message) {
            console.error(`[GuildChatWebSocketHandler] Failed to create guild chat subscription`);
          }
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error subscribing to guild chat:`, error);
        }
        
        // Subscribe to delete events with explicit destination
        console.log(`[GuildChatWebSocketHandler] Subscribing to delete events for guild ${guildId}`);
        try {
          subscriptionsRef.current.delete = ChatWebSocketService.subscribeToDeleteEvents('guild', guildId, (data) => {
            console.log(`[GuildChatWebSocketHandler] Received delete event:`, data);
            
            // Forward to parent component
            if (onDeleteMessage) {
              onDeleteMessage(data);
            }
          });
          
          if (!subscriptionsRef.current.delete) {
            console.error(`[GuildChatWebSocketHandler] Failed to create delete events subscription`);
          }
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error subscribing to delete events:`, error);
        }
        
        // Register direct event handlers as fallback for increased reliability
        try {
          subscriptionsRef.current.chatHandler = ChatWebSocketService.addHandler('CHAT_MESSAGE', (data) => {
            if (data && data.chatType === 'GUILD' && 
                (data.guildId === guildId || data.guildId?.toString() === guildId.toString() || !data.guildId)) {
              console.log(`[GuildChatWebSocketHandler] Direct handler received guild message:`, data);
              
              // Ensure the message has the guildId property
              const enhancedData = {
                ...data,
                guildId: data.guildId || guildId,
                chatType: 'GUILD'
              };
              
              // Forward to parent component
              if (onMessage) {
                onMessage(enhancedData);
              }
            }
          });
          
          subscriptionsRef.current.deleteHandler = ChatWebSocketService.addHandler('MESSAGE_DELETED', (data) => {
            if (data && data.chatType === 'GUILD' && 
                (data.guildId === guildId || data.guildId?.toString() === guildId.toString() || !data.guildId || 
                 (data.roomId && data.roomId.toString().includes(guildId)))) {
              console.log(`[GuildChatWebSocketHandler] Direct handler received delete event:`, data);
              
              // Forward to parent component
              if (onDeleteMessage) {
                onDeleteMessage(data);
              }
            }
          });
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error setting up direct handlers:`, error);
        }
        
        // Send a heartbeat to ensure the subscription is active
        try {
          ChatWebSocketService.sendHeartbeat(`guild-${guildId}`);
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error sending heartbeat:`, error);
        }
      } else {
        console.error(`[GuildChatWebSocketHandler] Cannot create subscriptions: WebSocket not connected`);
      }
    };
    
    const cleanupSubscriptions = () => {
      // Unsubscribe from regular subscriptions
      if (subscriptionsRef.current.message) {
        try {
          subscriptionsRef.current.message.unsubscribe();
          subscriptionsRef.current.message = null;
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error unsubscribing from message:`, error);
        }
      }
      
      if (subscriptionsRef.current.delete) {
        try {
          subscriptionsRef.current.delete.unsubscribe();
          subscriptionsRef.current.delete = null;
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error unsubscribing from delete:`, error);
        }
      }
      
      // Remove event handlers
      if (subscriptionsRef.current.chatHandler) {
        try {
          ChatWebSocketService.removeHandler(subscriptionsRef.current.chatHandler);
          subscriptionsRef.current.chatHandler = null;
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error removing chat handler:`, error);
        }
      }
      
      if (subscriptionsRef.current.deleteHandler) {
        try {
          ChatWebSocketService.removeHandler(subscriptionsRef.current.deleteHandler);
          subscriptionsRef.current.deleteHandler = null;
        } catch (error) {
          console.error(`[GuildChatWebSocketHandler] Error removing delete handler:`, error);
        }
      }
    };
    
    setupSubscriptions();
    
    // Clean up subscriptions when component unmounts
    return () => {
      console.log(`[GuildChatWebSocketHandler] Cleaning up subscriptions for guild ${guildId}`);
      cleanupSubscriptions();
    };
  }, [guildId, onMessage, onDeleteMessage]);
  
  // This component doesn't render anything
  return null;
};

// Make sure this component is properly exported as default
export default GuildChatWebSocketHandler;