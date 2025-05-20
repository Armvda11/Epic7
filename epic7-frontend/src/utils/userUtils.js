/**
 * Utility functions for user-related operations
 * 
 * IMPORTANT: This file centralizes user ID handling to ensure consistency across the application.
 * Always use these functions rather than direct localStorage access to maintain a single source of truth.
 * The primary user ID is stored in localStorage under the 'userId' key.
 */
// Direct localStorage access to avoid circular dependency with authService
const getUserIdFromStorage = () => localStorage.getItem('userId');

/**
 * Checks if the given user ID matches the current user ID
 * @param {string|number|object} userId - The user ID to check, can be a string, number, or an object with an id property
 * @returns {boolean} - True if the user ID matches the current user ID
 */
export const isCurrentUser = (userId) => {
  if (!userId) return false;
  
  const currentUserId = getUserIdFromStorage();
  if (!currentUserId) return false;
  
  // Convert both to strings for reliable comparison
  const currentUserIdStr = currentUserId.toString();
  
  // Case 1: userId is an object with an id property (e.g., { id: 123 })
  if (userId && typeof userId === 'object' && userId.id) {
    return userId.id.toString() === currentUserIdStr;
  }
  
  // Case 2: userId is a direct value (string or number)
  return userId.toString() === currentUserIdStr;
};

/**
 * Checks if a message is from the current user
 * @param {object} message - The message object to check
 * @returns {boolean} - True if the message is from the current user
 */
export const isOwnMessage = (message) => {
  if (!message) return false;
  
  // Case 1: Temporary message created client-side
  if (message.temporary === true || (message.clientSideId && message.clientSideId.startsWith('temp-'))) {
    return true;
  }
  
  // Case 2: Check direct senderId property (the only reliable method)
  if (message.senderId) {
    return isCurrentUser(message.senderId);
  }
  
  // Extract senderId from sender object if available
  if (message.sender && typeof message.sender === 'object' && message.sender.id) {
    return isCurrentUser(message.sender.id);
  }
  
  // Not our message
  return false;
};

/**
 * Gets the current user ID
 * @returns {string|null} - The current user ID or null if not available
 */
export const getCurrentUserId = () => {
  return getUserIdFromStorage();
};
