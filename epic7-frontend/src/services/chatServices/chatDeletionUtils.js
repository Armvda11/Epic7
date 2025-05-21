/**
 * Utility functions for handling message deletions across connected clients
 */

/**
 * Subscribe to message deletion notifications for a given room
 * 
 * @param {Object} stompClient - The connected STOMP client instance
 * @param {string} roomId - The room identifier in the format 'global', 'guild.123', etc.
 * @param {Function} onMessageDeleted - Callback to execute when a message deletion is received
 * @returns {Object} The subscription object that can be used to unsubscribe
 */
export const subscribeToMessageDeletions = (stompClient, roomId, onMessageDeleted) => {
  if (!stompClient || !stompClient.connected) {
    console.error('Cannot subscribe to message deletions: STOMP client not connected');
    return null;
  }

  try {
    // Determine the destination based on room ID
    let destination;
    
    if (roomId === 'global') {
      destination = '/topic/chat/global';
    } else if (roomId.startsWith('guild.')) {
      const guildId = roomId.split('.')[1];
      // Match the backend's topic path for guild chat
      destination = `/topic/chat/guild.${guildId}`;
    } else if (roomId.startsWith('fight.')) {
      const fightId = roomId.split('.')[1];
      destination = `/topic/chat/duel.${fightId}`;
    } else {
      console.warn(`Unknown room format for deletion subscription: ${roomId}`);
      return null;
    }
    
    console.log(`Subscribing to deletion notifications for ${roomId}`);

    // Always subscribe to /deletions (or fallback to /deleted) for deletion notifications, for all room types
    let subscription;
    try {
      console.log(`Trying to subscribe to ${destination}/deletions`);
      subscription = stompClient.subscribe(
        `${destination}/deletions`,
        (message) => {
          try {
            const payload = JSON.parse(message.body);
            if ((payload.type === 'deletion' || payload.type === 'MESSAGE_DELETED') && payload.messageId) {
              console.log(`Message deletion notification in ${roomId} (deletions format):`, payload);
              if (typeof onMessageDeleted === 'function') {
                onMessageDeleted(payload);
              }
            } else {
              console.log('Received non-deletion message on deletions subscription, ignoring:', payload);
            }
          } catch (error) {
            console.error('Error parsing message deletion notification:', error);
          }
        }
      );
      console.log(`Successfully subscribed to ${destination}/deletions`);
    } catch (error) {
      console.warn(`Failed to subscribe to ${destination}/deletions:`, error);
      // Fallback to /deleted format
      try {
        console.log(`Trying fallback: ${destination}/deleted`);
        subscription = stompClient.subscribe(
          `${destination}/deleted`,
          (message) => {
            try {
              const payload = JSON.parse(message.body);
              if (payload.type === 'deletion' && payload.messageId) {
                console.log(`Message deletion notification in ${roomId} (deleted format):`, payload);
                if (typeof onMessageDeleted === 'function') {
                  onMessageDeleted(payload);
                }
              } else {
                console.log('Received non-deletion message on deleted subscription, ignoring:', payload);
              }
            } catch (error) {
              console.error('Error parsing message deletion notification:', error);
            }
          }
        );
        console.log(`Successfully subscribed to ${destination}/deleted`);
      } catch (secondError) {
        console.error(`Failed to subscribe to both deletion formats for ${roomId}:`, secondError);
        return null;
      }
    }
    return subscription;
  } catch (error) {
    console.error('Error subscribing to deletion notification channel:', error);
    return null;
  }
};

/**
 * Process a message deletion notification and update the local message state
 * 
 * @param {Object} deletionPayload - The deletion notification payload from the server
 * @param {Array} currentMessages - The current messages array
 * @param {Function} setMessages - Function to update the messages state
 */
export const handleMessageDeletion = (deletionPayload, currentMessages, setMessages) => {
  if (!deletionPayload || !deletionPayload.messageId) {
    console.warn('Invalid deletion payload received:', deletionPayload);
    return;
  }
  
  // Extract the deleted message ID
  const deletedMessageId = deletionPayload.messageId;
  console.log(`Processing deletion of message ID ${deletedMessageId}`);
  
  // Filter out the deleted message from the current messages
  setMessages(currentMessages.filter(msg => 
    msg.id !== deletedMessageId && 
    msg.id?.toString() !== deletedMessageId.toString()
  ));
};
