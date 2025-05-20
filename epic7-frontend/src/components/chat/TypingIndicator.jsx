import React from 'react';

/**
 * Component that displays typing indicators
 * @param {Object} props - Component props
 * @param {Array} props.users - Array of usernames who are typing
 * @param {number} props.currentUserId - Current user ID to filter out own typing indicator
 * @param {string} props.language - Current language for translation
 */
const TypingIndicator = ({ users, currentUserId, language = 'en' }) => {
  if (!users || users.length === 0) return null;
  
  // Filter out current user
  const filteredUsers = users.filter(user => {
    // Skip if the user has the current user ID
    if (user.userId && currentUserId && user.userId === currentUserId) {
      return false;
    }
    return true;
  });
  
  if (filteredUsers.length === 0) return null;
  
  const getTranslation = (key) => {
    const translations = {
      en: {
        isTyping: 'is typing',
        peopleTyping: 'people are typing'
      },
      fr: {
        isTyping: 'est en train d\'écrire',
        peopleTyping: 'personnes sont en train d\'écrire'
      }
    };
    
    return translations[language]?.[key] || translations.en[key];
  };
  
  return (
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 italic my-2">
      {filteredUsers.length === 1 ? (
        <>
          <span className="font-medium">{filteredUsers[0].user}</span>
          <span className="ml-1">{getTranslation('isTyping')}</span>
        </>
      ) : (
        <>
          <span className="font-medium">{filteredUsers.length}</span>
          <span className="ml-1">{getTranslation('peopleTyping')}</span>
        </>
      )}
      <span className="ml-1 flex">
        <span className="animate-bounce mr-0.5">.</span>
        <span className="animate-bounce animation-delay-200 mr-0.5">.</span>
        <span className="animate-bounce animation-delay-400">.</span>
      </span>
    </div>
  );
};

export default TypingIndicator;
