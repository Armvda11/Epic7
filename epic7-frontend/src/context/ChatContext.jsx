import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  fetchGlobalChatRoom,
  fetchGuildChatRoom,
  fetchChatMessages,
  sendChatMessage,
  deleteChatMessage
} from "../services/ChatServices";
import ChatWebSocketService from "../services/ChatWebSocketService";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [globalChatRoom, setGlobalChatRoom] = useState(null);
  const [guildChatRooms, setGuildChatRooms] = useState({});
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) {
      setError("Invalid chat room ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const msgs = await fetchChatMessages(roomId);
      setMessages(msgs);
      ChatWebSocketService.connect(roomId);
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch and set global chat room
  const fetchGlobalRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const room = await fetchGlobalChatRoom();
      if (room && room.id) {
        setGlobalChatRoom(room);
        setCurrentRoom(room);
        fetchMessages(room.id);
      } else {
        setError("Global chat room not found.");
      }
    } catch (err) {
      setError("Failed to load global chat room");
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  // Fetch and set guild chat room by guildId
  const fetchChatRoomByGuildId = useCallback(async (guildId) => {
    setLoading(true);
    setError(null);
    try {
      const room = await fetchGuildChatRoom(guildId);
      setGuildChatRooms(prev => ({ ...prev, [guildId]: room }));
      setCurrentRoom(room);
      fetchMessages(room.id);
      return room;
    } catch (err) {
      setError("Failed to load guild chat room");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMessages]);

  // Switch to a different room
  const switchRoom = useCallback((room) => {
    setCurrentRoom(room);
    if (room && room.id) fetchMessages(room.id);
  }, [fetchMessages]);

  // Send a message
  const sendMessage = useCallback(async (content) => {
    if (!currentRoom || !content.trim()) return null;
    try {
      if (ChatWebSocketService.isConnected()) {
        ChatWebSocketService.sendMessage(content, currentRoom.id);
      }
      const response = await sendChatMessage(currentRoom.id, content);
      return response;
    } catch (err) {
      setError("Failed to send message");
      return null;
    }
  }, [currentRoom]);

  // Delete a message
  const deleteMessageById = useCallback(async (messageId) => {
    try {
      await deleteChatMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      return true;
    } catch (err) {
      setError("Failed to delete message");
      return false;
    }
  }, []);

  // WebSocket: handle incoming messages
  useEffect(() => {
    const handlerId = ChatWebSocketService.addHandler('onChatMessage', (msg) => {
      // msg is now the message object from data.message
      if (!msg || !msg.roomId) return;
      if (currentRoom && msg.roomId === currentRoom.id) {
        setMessages(prev => {
          // Try to find an optimistic message to replace
          const optimisticIndex = prev.findIndex(m =>
            m.isOptimistic &&
            m.content === msg.content &&
            m.sender?.id === msg.sender?.id
          );
          if (optimisticIndex !== -1) {
            // Replace the optimistic message with the real one
            const newMessages = [...prev];
            newMessages[optimisticIndex] = msg;
            return newMessages;
          }
          // Otherwise, add if not duplicate
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
    return () => {
      ChatWebSocketService.removeHandler(handlerId);
    };
  }, [currentRoom]);

  const value = {
    globalChatRoom,
    guildChatRooms,
    currentRoom,
    messages,
    loading,
    error,
    fetchGlobalChatRoom: fetchGlobalRoom,
    fetchChatRoomByGuildId,
    switchRoom,
    sendMessage,
    deleteMessage: deleteMessageById,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);