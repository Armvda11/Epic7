package com.epic7.backend.websocket;

import com.epic7.backend.model.chat.ChatMessage;

/**
 * Interface for broadcasting chat messages to connected WebSocket clients.
 * This interface is used to break the circular dependency between
 * ChatService and ChatWebSocketHandler.
 */
public interface ChatMessageBroadcaster {
    
    /**
     * Broadcast a chat message to all users in a room
     * 
     * @param roomId The chat room ID to broadcast to
     * @param chatMessage The message to broadcast
     */
    void broadcastChatMessage(Long roomId, ChatMessage chatMessage);
}