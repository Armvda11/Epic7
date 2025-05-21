import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPaperPlane, FaTrashAlt, FaRedo } from 'react-icons/fa';
import { useChatContext } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import useWebSocketReconnect from '../../hooks/useWebSocketReconnect';
import { formatChatErrorMessage } from '../../services/chatServices/chatErrorUtils';
import { isOwnMessage } from '../../utils/userUtils';

const ChatComponent = ({ roomType, guildId = null }) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [countdownTime, setCountdownTime] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryBackoffTime, setRetryBackoffTime] = useState(3); // Initial backoff time in seconds
  const [isUserAdmin, setIsUserAdmin] = useState(false); // Track if current user is admin
  const countdownRef = useRef(null);
  const reconnectTimeoutRef = useRef(null); // Add reference for reconnection timeout
  const { 
    messages, 
    typingUsers, 
    user, 
    loading, 
    error, 
    joinRoom, 
    leaveRoom, 
    sendMessage, 
    deleteMessage,
    setTyping,
    setMessages
  } = useChatContext();
  const { t, language } = useSettings();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevInput = useRef('');

  // Use our WebSocket reconnection hook with improved variables
  const { 
    isReconnecting, 
    wasReconnected, 
    reconnectBlocked, 
    reconnectAttempts, 
    maxReconnectAttempts 
  } = useWebSocketReconnect({
    onReconnect: () => {
      console.log('Chat WebSocket reconnected, rejoining room:', roomType, guildId);
      
      // Add a small delay before attempting to rejoin to prevent race conditions
      const reconnectTimeout = setTimeout(() => {
        // Use a try-catch to prevent blank page if rejoin fails
        try {
          joinRoom(roomType, guildId)
            .then(() => {
              console.log('Successfully rejoined room after reconnection');
              // Reset retry state on successful reconnection
              resetRetryState();
            })
            .catch(err => {
              console.error('Failed to rejoin room after reconnection:', err);
              // If rejoin fails, attempt retry with backoff
              if (!isRetrying && !countdownRef.current) {
                handleRetry();
              }
            });
        } catch (err) {
          console.error('Error during post-reconnection room join:', err);
        }
      }, 1000); // Wait 1 second before rejoining
      
      // Cleanup timeout to prevent memory leaks
      return () => clearTimeout(reconnectTimeout);
    }
  });
  
  // Function to handle manual retry
  const handleRetry = useCallback(async () => {
    // Stop any existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    setIsRetrying(true);
    
    try {
      await joinRoom(roomType, guildId);
      resetRetryState();
    } catch (err) {
      console.error('Retry failed:', err);
      
      // Increment retry count and increase backoff time
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Exponential backoff: 3s, 6s, 12s, etc. (capped at 30s)
      const newBackoffTime = Math.min(retryBackoffTime * (newRetryCount <= 1 ? 1 : 2), 30);
      setRetryBackoffTime(newBackoffTime);
      
      // Start countdown for next automatic retry
      startCountdown(newBackoffTime);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, retryBackoffTime, roomType, guildId, joinRoom]);
  
  // Function to start the countdown timer
  const startCountdown = useCallback((seconds) => {
    setCountdownTime(seconds);
    
    // Clear any existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    // Set up new countdown interval
    countdownRef.current = setInterval(() => {
      setCountdownTime(prevTime => {
        const newTime = prevTime - 1;
        
        if (newTime <= 0) {
          // When countdown reaches zero, clear interval and trigger retry
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          handleRetry();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
  }, [handleRetry]);
  
  // Reset retry state
  const resetRetryState = useCallback(() => {
    setRetryCount(0);
    setRetryBackoffTime(3);
    setCountdownTime(0);
    setIsRetrying(false);
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);
  
  // Clean up the interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Join chat room on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        console.log(`Joining chat room: ${roomType}${guildId ? `, guild: ${guildId}` : ''}`);
        
        // Enhanced user logging for debugging
        if (user) {
          console.log('User info before joining room:', {
            id: user.id,
            email: user.email,
            username: user.username,
            idType: typeof user.id
          });
          
          // Make sure user.id is a number or numeric string
          if (user.id && (isNaN(user.id) || typeof user.id === 'object')) {
            console.warn('User ID is not a valid numeric format:', user.id);
          }
        }
        
        const roomData = await joinRoom(roomType, guildId);
        
        // Check for admin status from room data
        if (roomData && roomData.isAdmin) {
          setIsUserAdmin(true);
        } else {
          // Fallback admin check based on roles
          const { roles } = user || {};
          const isAdminByRole = Array.isArray(roles) && 
            (roles.includes('ADMIN') || roles.includes('MODERATOR'));
          
          setIsUserAdmin(isAdminByRole);
        }
        
        // Reset retry state when successfully joined
        resetRetryState();
      } catch (error) {
        console.error('Failed to join chat room:', error);
        // If initial connection fails, start the retry process
        if (!isReconnecting && !countdownRef.current) {
          handleRetry();
        }
      }
    };

    // Initialize the chat when the component mounts
    initChat();

    // Leave chat room when component unmounts
    return () => {
      // Clear all temporary messages first to prevent duplication on remount
      setMessages(prev => prev.filter(msg => !msg.temporary));
      
      // Then leave the room
      leaveRoom();
      
      // Clear any running timers
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // Clear reconnection timeout if it exists
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [joinRoom, leaveRoom, roomType, guildId, handleRetry, resetRetryState, setMessages, user]);

  // Scroll to bottom when new messages arrive and log debug info
  useEffect(() => {
    // Only log if we have messages
    if (messages?.length > 0) {
      console.log(`Received ${messages.length} messages in chat component`);
      
      // Check if we have any undefined or null content
      const invalidMessages = messages.filter(m => !m || !m.content || typeof m.content !== 'string');
      if (invalidMessages.length > 0) {
        console.warn(`Found ${invalidMessages.length} invalid messages:`, 
          invalidMessages.map(m => ({
            id: m?.id, 
            hasContent: Boolean(m?.content),
            contentType: m?.content ? typeof m.content : 'undefined or null',
            hasSender: Boolean(m?.sender)
          }))
        );
      }
    }
    
    // Make sure we scroll to bottom after receiving messages
    scrollToBottom();
  }, [messages]);

  // Deduplicate messages on update with enhanced tracking of processed IDs
  useEffect(() => {
    if (!messages || messages.length <= 1) return;
    
    // Extract all message IDs for deduplication check
    const messageIds = messages.filter(m => m && m.id).map(m => m.id.toString());
    const uniqueIds = new Set(messageIds);
    
    // If we have duplicates, clean them up
    if (uniqueIds.size < messageIds.length) {
      console.log('Found', messageIds.length - uniqueIds.size, 'duplicate messages by ID, deduplicating...');
      
      // Create a map to store unique messages
      const uniqueMessages = new Map();
      
      // First pass: process messages with server IDs
      messages.forEach(message => {
        if (!message) return; // Skip null/undefined messages
        
        // For messages with ID from server
        if (message && message.id) {
          const idString = message.id.toString();
          
          // Always favor non-temporary messages over temporary ones
          if (!uniqueMessages.has(idString) || 
              (uniqueMessages.get(idString).temporary === true && message.temporary !== true)) {
            uniqueMessages.set(idString, message);
          }
        }
      });
      
      // Second pass: handle temporary messages and potential content duplicates
      messages.forEach(message => {
        if (!message) return; // Skip null messages
        
        // Skip messages already handled in the first pass (those with IDs)
        if (message.id && uniqueMessages.has(message.id.toString())) {
          return;
        }
        
        // For temporary messages, use content as the key
        if (message.temporary && message.content) {
          const contentHash = `temp-${message.content}`;
          
          // Check if there's a message with this exact content already in our map
          let isDuplicate = false;
          
          // Check if there's already a non-temporary message with the same content
          for (const [_, existingMsg] of uniqueMessages.entries()) {
            if (!existingMsg.temporary && existingMsg.content === message.content) {
              isDuplicate = true;
              break;
            }
          }
          
          if (!isDuplicate && !uniqueMessages.has(contentHash)) {
            uniqueMessages.set(contentHash, message);
          }
        } 
        // For client-side ID messages (our own temporary messages)
        else if (message.clientSideId) {
          const clientId = message.clientSideId;
          
          // Check for duplicate content first
          let isDuplicate = false;
          for (const [_, existingMsg] of uniqueMessages.entries()) {
            if (existingMsg.content === message.content && 
                (!message.sender || !existingMsg.sender || 
                 isUserOwnMessage(message) === isUserOwnMessage(existingMsg))) {
              isDuplicate = true;
              break;
            }
          }
          
          if (!isDuplicate && !uniqueMessages.has(clientId)) {
            uniqueMessages.set(clientId, message);
          }
        }
        // Any other message without an ID gets a generated key
        else if (message.content) {
          const randomKey = `noId-${Math.random().toString(36).substring(2, 9)}`;
          uniqueMessages.set(randomKey, message);
        }
      });
      
      // Convert map back to array and sort by timestamp if possible
      const dedupedMessages = Array.from(uniqueMessages.values())
        .sort((a, b) => {
          // Sort by timestamp if available
          if (a.timestamp && b.timestamp) {
            return new Date(a.timestamp) - new Date(b.timestamp);
          }
          return 0; // Keep original order if no timestamp
        });
      
      if (dedupedMessages.length < messages.length) {
        console.log('Removed', messages.length - dedupedMessages.length, 'duplicate messages');
        setMessages(dedupedMessages);
      }
    }
  }, [messages, setMessages]);

  // Handle typing status
  useEffect(() => {
    if (isTyping) {
      setTyping(true);
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set a new timeout to stop typing status after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 2000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, setTyping]);

  // Send typing status
  useEffect(() => {
    // Only send typing=true when there's actual text
    if (messageInput && messageInput.trim().length > 0) {
      if (!prevInput.current || prevInput.current.trim().length === 0) {
        // Only send typing=true when transitioning from empty to non-empty
        setTyping(true);
      }
    } else if (!messageInput || messageInput.trim().length === 0) {
      // Only send typing=false when the text area is completely empty
      if (prevInput.current && prevInput.current.trim().length > 0) {
        setTyping(false);
      }
    }
    prevInput.current = messageInput;
  }, [messageInput, setTyping]);

  // Ensure typing=false is sent when component unmounts or user navigates away
  useEffect(() => {
    // Set up a handler for beforeunload event to catch page navigation/refresh
    const handleBeforeUnload = () => {
      // Send typing=false synchronously before page unload
      if (isTyping) {
        setTyping(false);
      }
    };
    
    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function when component unmounts
    return () => {
      // Remove the event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Send typing=false when component unmounts
      if (isTyping) {
        setTyping(false);
      }
    };
  }, [isTyping, setTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);
    
    // Only send typing notifications when there's a change in typing state
    const isEmpty = value.trim().length === 0;
    
    if (!isTyping && !isEmpty) {
      // Send typing=true when starting to type
      setIsTyping(true);
    } else if (isTyping && isEmpty) {
      // Only send typing=false when text area becomes empty
      setIsTyping(false);
      setTyping(false);
    }
  };

  // Send the message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (messageInput.trim()) {
      try {
        // Generate a unique client-side ID for this message
        const timestamp = Date.now();
        const temporaryId = `temp-${timestamp}`;
        
        // Create a sender object based on the consistent user ID
        const senderInfo = user ? {
          id: user.id,
          username: user.username
        } : null;
        
        // Log the user ID being used
        console.log('Sending message with user ID:', user?.id);
        
        // Create a temporary message object for immediate UI feedback
        const temporaryMessage = {
          id: null, // No server ID yet
          clientSideId: temporaryId, // Unique identifier for client-side tracking
          content: messageInput.trim(),
          sender: senderInfo,
          timestamp: new Date(timestamp).toISOString(),
          temporary: true // Flag to identify this as a temporary message
        };
        
        // Save the message to be sent first (prevents race conditions)
        const messageToSend = messageInput.trim();
        setMessageInput('');
        
        // Add the temporary message to the UI first
        setMessages(prevMessages => [...prevMessages, temporaryMessage]);
        
        // Send the message to the server
        console.log('Sending message:', messageToSend);
        await sendMessage(messageToSend);
        
        // When server sends back confirmation, our handleMessageReceived will replace the temp message
        setIsTyping(false);
        setTyping(false);
      } catch (error) {
        console.error('Failed to send message:', error);
        // On error, let the user know and allow them to try again
        alert('Failed to send message. Please try again.');
        setMessageInput(messageInput); // Restore input so user doesn't lose their message
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      console.log('Deleting message with ID:', messageId);
      
      // Check if this is a temporary message (starts with "temp-")
      const isTemporaryMessage = typeof messageId === 'string' && 
        (messageId.startsWith('temp-') || // Handle "temp-timestamp" format
         (messageId.includes('-') && messageId.split('-')[0] === 'temp')); // Handle "temp-timestamp-index" format
      
      if (isTemporaryMessage) {
        // For temporary messages, we only need to remove them from the local state
        console.log('Removing temporary message from UI:', messageId);
        setMessages(prev => 
          prev.filter(msg => {
            // Filter out the temporary message by its ID or clientSideId
            if (msg.id === messageId || msg.clientSideId === messageId) {
              return false; // Remove this message
            }
            return true; // Keep other messages
          })
        );
        console.log('Temporary message removed successfully');
        return;
      }
      
      // Handle regular messages
      // Extract the server message ID by removing the client-side index suffix if present
      let serverMessageId;
      
      if (typeof messageId === 'string' && messageId.includes('-')) {
        // Split by the first dash only for IDs like "123-4" but not for "temp-1747309865143-6"
        const parts = messageId.split('-');
        serverMessageId = parseInt(parts[0], 10);
      } else {
        serverMessageId = messageId;
      }
      
      console.log('Extracted server message ID:', serverMessageId);
      
      // Only proceed if we have a valid server ID
      if (!isNaN(serverMessageId)) {
        await deleteMessage(serverMessageId);
        
        // Remove the message from the local state for immediate UI update
        setMessages(prev => 
          prev.filter(msg => {
            // Filter out the message by its serverMessageId or clientSideId
            if (msg.id === serverMessageId || msg.clientSideId === messageId) {
              return false; // Remove this message
            }
            return true; // Keep other messages
          })
        );
        
        console.log(`Message ${serverMessageId} deleted successfully`);
      } else {
        console.error('Invalid message ID format for deletion:', messageId, 
                     'Type:', typeof messageId,
                     'Is temp format:', isTemporaryMessage);
        
        // Even if the server ID is invalid, still try to remove from UI if we have a messageId
        if (messageId) {
          setMessages(prev => 
            prev.filter(msg => {
              // Filter by any ID attribute we can find
              return msg.id !== messageId && 
                     msg.clientSideId !== messageId && 
                     (typeof msg.id !== 'string' || !msg.id.includes(messageId));
            })
          );
          console.log('Attempted to remove message with invalid ID format from UI');
        }
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Helper function to format messages by date groups
  const formatMessages = () => {
    if (!messages || !messages.length) {
      console.log('No messages to format');
      return [];
    }
    
    console.log('Formatting', messages.length, 'messages');
    
    // Log sample message objects for debugging
    if (messages.length > 0) {
      console.log('Sample message objects:', messages.slice(0, 3).map(msg => ({
        id: msg?.id,
        content: msg?.content?.substring(0, 30),
        sender: typeof msg?.sender === 'string' ? msg?.sender : 'object',
        timestamp: msg?.timestamp
      })));
    }
    
    // Simple filtering to ensure all messages have required fields
    const validMessages = messages.filter(message => 
      message && typeof message?.content === 'string' && message?.sender
    );
    
    if (validMessages.length === 0) {
      console.log('No valid messages after filtering, raw messages:', 
        messages.map(m => ({ 
          hasContent: Boolean(m?.content), 
          hasSender: Boolean(m?.sender),
          contentType: m?.content ? typeof m.content : 'undefined'
        })));
      return [];
    }
    
    console.log('Valid messages after filtering:', validMessages.length);
    
    // Group messages by date (use YYYY-MM-DD for grouping)
    const groupedMessages = validMessages.reduce((groups, message) => {
      let dateKey;
      try {
        if (!message.timestamp || isNaN(new Date(message.timestamp).getTime())) {
          dateKey = 'Unknown Date';
        } else {
          // Always use UTC date part for grouping
          const dateObj = new Date(message.timestamp);
          // Get YYYY-MM-DD in UTC
          dateKey = dateObj.toISOString().slice(0, 10);
        }
      } catch (e) {
        console.warn('Invalid date format:', message.timestamp);
        dateKey = 'Unknown Date';
      }
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      return groups;
    }, {});
    
    // Convert groups to array format for rendering
    const result = Object.keys(groupedMessages).map(dateKey => ({
      dateKey, // keep the raw key for formatting
      messages: groupedMessages[dateKey]
    }));
    
    console.log('Formatted message groups:', result.length, 'groups with', 
                result.reduce((sum, group) => sum + group.messages.length, 0), 'total messages');
    
    return result;
  };  // Check if a message is from the current user
  // We directly use the isOwnMessage utility from userUtils.js with no local implementation
  const isUserOwnMessage = (message) => {
    // Call the imported isOwnMessage function
    return isOwnMessage(message);
  };

  // Check if chat is ready
  const isChatReady = !loading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    // Format the error message
    const formattedError = formatChatErrorMessage(error, language);
    const isServerError = formattedError.includes('server') || 
                         formattedError.includes('session') || 
                         formattedError.includes('collection');
    
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg text-red-700 dark:text-red-300 max-w-md">
          <p className="text-center font-medium mb-3">{t("chatError", language) || "Chat Error"}</p>
          <p className="mb-4">{formattedError}</p>
          
          {/* Status indicator: retrying, countdown, or reconnecting */}
          <div className="my-4">
            {isRetrying && (
              <div className="flex justify-center items-center text-amber-600 dark:text-amber-400">
                <div className="animate-spin h-5 w-5 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                <span>{t("retrying", language) || "Retrying connection..."}</span>
              </div>
            )}
            
            {!isRetrying && countdownTime > 0 && (
              <div className="text-center text-amber-600 dark:text-amber-400">
                <p>{t("retryCountdown", language) || "Retrying in"}: <span className="font-bold">{countdownTime}</span> {t("seconds", language) || "seconds"}</p>
                <p className="text-xs mt-1">{t("retryAttempt", language) || "Retry attempt"}: {retryCount}</p>
              </div>
            )}
            
            {isReconnecting && (
              <div className="flex justify-center items-center text-amber-600 dark:text-amber-400">
                <div className="animate-spin h-5 w-5 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                <span>{t("reconnecting", language) || "Reconnecting..."}</span>
              </div>
            )}
          </div>
          
          {/* Retry button */}
          {!isRetrying && !isReconnecting && (
            <button 
              onClick={handleRetry}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded w-full transition-colors flex items-center justify-center"
              disabled={isRetrying}
            >
              <FaRedo className="mr-2" />
              {countdownTime > 0
                ? (t("retryNow", language) || "Retry Now")
                : (t("retryConnection", language) || "Retry Connection")
              }
            </button>
          )}
        </div>
      </div>
    );
  }

  // Filter out current user from typingUsers
  const typingUsernames = typingUsers.filter(
    (u) => u !== user?.username && u !== user?.email
  );

  return (
    <div className="flex flex-col h-full">
      {/* Connection status banners */}
      {isReconnecting && (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 text-yellow-800 dark:text-yellow-200 text-center text-sm">
          {t("reconnecting", language) || "Reconnecting..."}
        </div>
      )}
      
      {wasReconnected && (
        <div className="bg-green-100 dark:bg-green-900 p-2 text-green-800 dark:text-green-200 text-center text-sm animate-pulse">
          {t("connectionRestored", language) || "Connection restored"}
        </div>
      )}
      
      {/* Retry countdown banner */}
      {!isReconnecting && countdownTime > 0 && (
        <div className="bg-amber-100 dark:bg-amber-900 p-2 flex justify-between items-center">
          <span className="text-amber-800 dark:text-amber-200 text-sm">
            {t("retryCountdown", language) || "Retrying in"}: {countdownTime}s
          </span>
          <button 
            onClick={handleRetry}
            className="text-xs bg-amber-200 dark:bg-amber-700 py-1 px-2 rounded text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
            disabled={isRetrying}
          >
            {t("retryNow", language) || "Retry Now"}
          </button>
        </div>
      )}
      
      {/* Retrying banner */}
      {isRetrying && !isReconnecting && (
        <div className="bg-amber-100 dark:bg-amber-900 p-2 text-amber-800 dark:text-amber-200 text-center text-sm flex justify-center items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
          {t("retrying", language) || "Retrying connection..."}
        </div>
      )}
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-center">
              <p>{t("noMessages", language) || "No messages yet"}</p>
              <p className="text-sm mt-2">{t("startConversation", language) || "Start the conversation!"}</p>
            </div>
          </div>
        ) : (
          formatMessages().map((group, groupIndex) => (
            <div key={`group-${group.dateKey}-${groupIndex}`} className="space-y-2">
              {/* Date separator */}
              <div className="text-center">
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {group.dateKey === 'Unknown Date' ? 
                    t("unknownDate", language) || "Unknown Date" : 
                    (() => {
                      try {
                        // Parse YYYY-MM-DD as UTC date
                        const [year, month, day] = group.dateKey.split('-');
                        const dateObj = new Date(Date.UTC(year, month - 1, day));
                        return dateObj.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      } catch (e) {
                        return group.dateKey;
                      }
                    })()
                  }
                </span>
              </div>
              
              {/* Messages in this date group */}
              {group.messages.map((message, messageIndex) => (
                <div 
                  key={message.clientSideId || (message.id ? `server-${message.id}` : `msg-${group.date}-${messageIndex}`)} 
                  className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'} mb-2 relative group`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg px-4 py-2 relative ${
                      isOwnMessage(message)
                          ? 'bg-purple-800 text-white rounded-tr-none' // Darker purple for own messages
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none'
                      }`}
                    >
                    {/* Message sender name (not shown for own messages) */}
                    {!isOwnMessage(message) && (
                      <div className="font-bold text-sm text-purple-700 dark:text-purple-400 flex items-center gap-1">
                        {(() => {
                          // Extract the sender name with priority on username
                          if (typeof message.sender === 'string') {
                            // For string sender, use it directly
                            return message.sender;
                          } else if (message.sender?.username) {
                            // If there's a username property, use it
                            return message.sender.username;
                          } else if (message.sender?.id) {
                            // If we only have an ID, use a generic name with the ID
                            return `User ${message.sender.id}`;
                          }
                          
                          // Fallback
                          return t("unknownUser", language) || "Unknown";
                        })()}
                        
                        {/* Admin badge - show if sender has admin role */}
                        {message.sender && 
                         ((typeof message.sender === 'object' && message.sender.isAdmin) ||
                          (typeof message.sender === 'string' && 
                           (message.sender.includes('admin') || message.sender.includes('moderator')))) && (
                          <span className="bg-purple-700 text-white text-[10px] px-1 py-0.5 rounded ml-1">
                            Admin
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div className="break-words">
                      {message.content}
                    </div>
                    
                    {/* Message timestamp and delete button container */}
                    <div className="flex justify-between items-center mt-1">
                      {/* Delete button for own messages or admin - positioned inside the message bubble */}
                      {(isOwnMessage(message) || isUserAdmin) && (
                        <button 
                          onClick={() => handleDeleteMessage(message.clientSideId || message.id)}
                          className={`text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isUserAdmin && !isOwnMessage(message)
                              ? 'text-red-500 hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-600' 
                              : 'text-purple-300 hover:text-white hover:bg-purple-700'
                          }`}
                          title={isUserAdmin && !isOwnMessage(message)
                            ? (t("adminDeleteMessage", language) || "Admin: Delete this message") 
                            : (t("deleteMessage", language) || "Delete this message")}
                        >
                          <FaTrashAlt />
                        </button>
                      )}
                      
                      {/* Message timestamp */}
                      <div className={`text-xs opacity-70 ${isOwnMessage(message) || !isUserAdmin ? 'ml-auto' : ''}`}>
                        {(() => {
                          try {
                            return message.timestamp && !isNaN(new Date(message.timestamp).getTime()) ?
                              new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                              t("unknownTime", language) || "Unknown time";
                          } catch (e) {
                            return t("unknownTime", language) || "Unknown time";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsernames.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            {typingUsernames.length === 1
              ? `${typingUsernames[0]} ${t("isTyping", language)}...`
              : `${typingUsernames.length} ${t("peopleTyping", language)}...`}
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2f2b50]">
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder={t("typeMessage", language)}
            className="flex-1 p-3 bg-white dark:bg-[#3a3660] text-gray-900 dark:text-white border-none focus:outline-none"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="bg-purple-600 text-white px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
