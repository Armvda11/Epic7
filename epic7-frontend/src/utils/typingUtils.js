/**
 * Utility functions for managing typing status notifications in chat
 */

/**
 * Debounces typing events to reduce the number of typing notifications sent
 * @param {Function} func - The function to debounce (typically setTyping)
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - The debounced function
 */
export const debounceTyping = (func, delay = 1000) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Determines if typing status should change based on input text
 * @param {string} text - The current text in the input
 * @param {string} prevText - The previous text in the input
 * @returns {Object} - { shouldSendTyping, typingStatus } 
 */
export const shouldUpdateTypingStatus = (text, prevText) => {
  const isEmpty = !text || text.trim().length === 0;
  const wasEmpty = !prevText || prevText.trim().length === 0;
  
  // Only send typing=true when starting to type (empty -> non-empty)
  if (wasEmpty && !isEmpty) {
    return { shouldSendTyping: true, typingStatus: true };
  }
  
  // Only send typing=false when the textarea becomes empty (non-empty -> empty)
  if (!wasEmpty && isEmpty) {
    return { shouldSendTyping: true, typingStatus: false };
  }
  
  // Don't send any update when there's no change in typing state
  return { shouldSendTyping: false, typingStatus: null };
};

/**
 * Creates a typing handler for textarea/input change events
 * @param {Function} setTyping - The function to update typing status
 * @param {Function} setInputValue - The function to update input value
 * @param {Function} setIsTyping - The function to update local typing state
 * @returns {Function} - Event handler for onChange
 */
export const createTypingHandler = (setTyping, setInputValue, setIsTyping) => {
  let prevValue = '';
  
  return (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    const { shouldSendTyping, typingStatus } = shouldUpdateTypingStatus(value, prevValue);
    
    if (shouldSendTyping) {
      setIsTyping(typingStatus);
      setTyping(typingStatus);
    }
    
    prevValue = value;
  };
};

/**
 * Handles cleanup when navigating away from the chat or component unmounts
 * @param {Function} setTyping - The function to update typing status
 * @param {boolean} isTyping - Current typing state
 */
export const cleanupTyping = (setTyping, isTyping) => {
  if (isTyping) {
    setTyping(false);
  }
};
