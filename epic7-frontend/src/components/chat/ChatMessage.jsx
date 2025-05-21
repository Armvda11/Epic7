import React from 'react';
import { useChatContext, isUserMessage, getMessageStyle } from '../../context/ChatContext';

const ChatMessage = ({ message }) => {
  const { user } = useChatContext();
  
  if (!message || !message.content) return null;
  
  // Log for debugging
  console.log("Rendering message:", {
    messageId: message.id,
    senderId: message.sender?.id,
    currentUserId: user?.id,
    content: message.content
  });
  
  const isOwnMessage = isUserMessage(message, user?.id);
  const messageStyle = getMessageStyle(message, user?.id);
  
  return (
    <div 
      className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`} 
      style={messageStyle}
      data-user-id={user?.id}
      data-sender-id={message.sender?.id}
    >
      {!isOwnMessage && (
        <div className="message-sender">
          {message.sender?.username || 'Unknown User'}
        </div>
      )}
      <div className="message-content">{message.content}</div>
      <div className="message-time">
        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
      </div>
    </div>
  );
};

export default ChatMessage;
