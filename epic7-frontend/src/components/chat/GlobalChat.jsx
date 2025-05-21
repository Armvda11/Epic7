import React from 'react';
import ChatComponent from './ChatComponent';

/**
 * GlobalChat component that displays the global chat room
 * This is a simple wrapper around ChatComponent
 */
const GlobalChat = () => {
  return <ChatComponent roomType="global" />;
};

export default GlobalChat;