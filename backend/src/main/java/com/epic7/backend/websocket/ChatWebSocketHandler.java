package com.epic7.backend.websocket;

import com.epic7.backend.dto.ChatMessageDTO;
import com.epic7.backend.dto.UserDTO;
import com.epic7.backend.event.ChatMessageEvent;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.service.ChatService;
import com.epic7.backend.service.UserService;
import com.epic7.backend.utils.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler for chat functionality.
 * This handles real-time chat messages and notifications.
 */
@Component
@Slf4j
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatService chatService;
    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    
    // Map to track which user is connected to which session
    private final Map<WebSocketSession, UserRoomInfo> sessions = new ConcurrentHashMap<>();
    // Map to track all sessions in a room
    private final Map<Long, Map<Long, WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    
    public ChatWebSocketHandler(ChatService chatService, UserService userService, ObjectMapper objectMapper, JwtUtil jwtUtil) {
        this.chatService = chatService;
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.jwtUtil = jwtUtil;
    }
    
    /**
     * Listen for ChatMessageEvent and broadcast the message to all clients in the room
     */
    @EventListener
    public void handleChatMessageEvent(ChatMessageEvent event) {
        Long roomId = event.getRoomId();
        ChatMessage message = event.getMessage();
        
        try {
            // Convert to DTO for smaller payload - Include sender's user ID
            ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(message, message.getSender().getId());
            
            // Create message payload
            ObjectNode messageNode = objectMapper.createObjectNode();
            messageNode.put("type", "CHAT_MESSAGE");
            messageNode.set("message", objectMapper.valueToTree(messageDTO));
            
            // Broadcast to all users in the room
            broadcastToRoom(roomId, new TextMessage(messageNode.toString()), null);
            
            log.info("Message broadcast to room {} via event", roomId);
        } catch (Exception e) {
            log.error("Error broadcasting message via event", e);
        }
    }
    
    /**
     * Class to store information about a connected user
     */
    private static class UserRoomInfo {
        private final Long userId;
        private final Long roomId;
        private User user;
        
        public UserRoomInfo(Long userId, Long roomId) {
            this.userId = userId;
            this.roomId = roomId;
        }
        
        public void setUser(User user) {
            this.user = user;
        }
    }
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {}", session.getId());
        
        // Extract room ID from the URL
        Map<String, String> pathVariables = extractPathVariables(session.getUri().getPath());
        String roomIdStr = pathVariables.get("roomId");
        
        // Extract user ID and token from query parameters
        Map<String, String> queryParams = extractQueryParams(session.getUri().getQuery());
        String userIdStr = queryParams.get("userId");
        String token = queryParams.get("token");
        
        if (roomIdStr == null || userIdStr == null || token == null) {
            log.error("Missing roomId, userId, or token, closing connection");
            session.close(CloseStatus.BAD_DATA);
            return;
        }
        
        try {
            // Validate JWT token
            if (!jwtUtil.validateToken(token)) {
                log.error("Invalid JWT token, closing connection");
                session.close(CloseStatus.NOT_ACCEPTABLE);
                return;
            }
            
            // Extract email from token
            String email = jwtUtil.extractEmail(token);
            Long userId = Long.parseLong(userIdStr);
            
            // Retrieve user information by ID instead of email
            User user = userService.getUserById(userId);
            if (user == null) {
                log.error("User not found with ID: {}", userId);
                session.close(CloseStatus.BAD_DATA);
                return;
            }
            
            // Verify token email matches the user's email
            if (!user.getEmail().equals(email)) {
                log.error("Email mismatch in token: token email {} vs. user email {}", email, user.getEmail());
                session.close(CloseStatus.BAD_DATA);
                return;
            }
            
            Long roomId = Long.parseLong(roomIdStr);
            
            // Retrieve room information
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            if (chatRoom == null) {
                log.error("Chat room not found: {}", roomId);
                session.close(CloseStatus.BAD_DATA);
                return;
            }
            
            // Check if user has access to this chat room
            if (!chatService.canUserAccessChat(userId, chatRoom)) {
                log.error("User {} does not have access to chat room {}", userId, roomId);
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }
            
            // Associate session with user and room
            UserRoomInfo userRoomInfo = new UserRoomInfo(userId, roomId);
            userRoomInfo.setUser(user);
            sessions.put(session, userRoomInfo);
            
            // Add session to room sessions
            roomSessions.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
                    .put(userId, session);
            
            // Notify other users in the room that a new user has joined
            notifyUserJoined(roomId, user, userId);
            
            log.info("User {} connected to chat room {}", userId, roomId);
        } catch (NumberFormatException e) {
            log.error("Invalid roomId or userId format", e);
            session.close(CloseStatus.BAD_DATA);
        } catch (Exception e) {
            log.error("Error establishing WebSocket connection", e);
            session.close(CloseStatus.SERVER_ERROR);
        }
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("Received message: {}", payload);
        
        UserRoomInfo userRoomInfo = sessions.get(session);
        if (userRoomInfo == null) {
            log.error("Session not associated with any user-room: {}", session.getId());
            return;
        }
        
        try {
            JsonNode jsonNode = objectMapper.readTree(payload);
            String messageType = jsonNode.path("type").asText();
            
            switch (messageType) {
                case "CHAT_MESSAGE":
                    handleChatMessage(userRoomInfo, jsonNode);
                    break;
                case "TYPING":
                    handleTypingNotification(userRoomInfo, jsonNode);
                    break;
                default:
                    log.warn("Unknown message type: {}", messageType);
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket message", e);
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("WebSocket connection closed: {} with status: {}", session.getId(), status);
        
        UserRoomInfo userRoomInfo = sessions.get(session);
        if (userRoomInfo != null) {
            // Remove session from tracking
            sessions.remove(session);
            
            // Remove from room sessions
            Map<Long, WebSocketSession> roomSessionMap = roomSessions.get(userRoomInfo.roomId);
            if (roomSessionMap != null) {
                roomSessionMap.remove(userRoomInfo.userId);
                
                // Notify other users that this user has left
                notifyUserLeft(userRoomInfo.roomId, userRoomInfo.user, userRoomInfo.userId);
            }
            
            log.info("User {} disconnected from chat room {}", userRoomInfo.userId, userRoomInfo.roomId);
        }
    }
    
    /**
     * Handle a chat message from a user
     */
    private void handleChatMessage(UserRoomInfo userRoomInfo, JsonNode jsonNode) {
        try {
            String content = jsonNode.path("content").asText();
            if (content == null || content.trim().isEmpty()) {
                log.warn("Empty message content received");
                return;
            }
            
            // Save message to database
            ChatMessage chatMessage = chatService.sendMessage(userRoomInfo.user, userRoomInfo.roomId, content);
            
            // Debug the user info being set in the message
            log.debug("Message sender: id={}, username={}", 
                    chatMessage.getSender().getId(), 
                    chatMessage.getSender().getUsername());
            
            // Broadcast the message to all connected users in the room
            broadcastChatMessage(userRoomInfo.roomId, chatMessage);
            
            log.info("Message from user {} broadcast to room {}", userRoomInfo.userId, userRoomInfo.roomId);
        } catch (Exception e) {
            log.error("Error processing chat message", e);
        }
    }
    
    /**
     * Handle typing notification
     */
    private void handleTypingNotification(UserRoomInfo userRoomInfo, JsonNode jsonNode) {
        try {
            boolean isTyping = jsonNode.path("isTyping").asBoolean();
            
            // Create typing notification with DTOs
            ObjectNode notification = objectMapper.createObjectNode();
            notification.put("type", "TYPING");
            notification.put("isTyping", isTyping);
            
            // Add user info using UserDTO format
            UserDTO userDTO = UserDTO.fromEntity(userRoomInfo.user);
            notification.set("user", objectMapper.valueToTree(userDTO));
            
            // Broadcast to all users in the room except sender
            broadcastToRoom(userRoomInfo.roomId, new TextMessage(notification.toString()), userRoomInfo.userId);
        } catch (Exception e) {
            log.error("Error processing typing notification", e);
        }
    }
    
    /**
     * Broadcast a chat message to all users in a room
     */
    public void broadcastChatMessage(Long roomId, ChatMessage chatMessage) {
        try {
            // Convert to DTO for smaller payload - Include sender's user ID
            ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(chatMessage, chatMessage.getSender().getId());
            
            // Create message payload
            ObjectNode messageNode = objectMapper.createObjectNode();
            messageNode.put("type", "CHAT_MESSAGE");
            messageNode.set("message", objectMapper.valueToTree(messageDTO));
            
            // Broadcast to all users in the room
            broadcastToRoom(roomId, new TextMessage(messageNode.toString()), null);
        } catch (Exception e) {
            log.error("Error broadcasting chat message", e);
        }
    }
    
    /**
     * Notify users in a room that a user has joined
     */
    private void notifyUserJoined(Long roomId, User user, Long excludeUserId) {
        try {
            // Use UserDTO for smaller payload
            UserDTO userDTO = UserDTO.fromEntity(user);
            
            ObjectNode notification = objectMapper.createObjectNode();
            notification.put("type", "USER_JOINED");
            notification.set("user", objectMapper.valueToTree(userDTO));
            
            // Broadcast to all users in the room except the user who joined
            broadcastToRoom(roomId, new TextMessage(notification.toString()), excludeUserId);
        } catch (Exception e) {
            log.error("Error sending user joined notification", e);
        }
    }
    
    /**
     * Notify users in a room that a user has left
     */
    private void notifyUserLeft(Long roomId, User user, Long excludeUserId) {
        try {
            // Use UserDTO for smaller payload
            UserDTO userDTO = UserDTO.fromEntity(user);
            
            ObjectNode notification = objectMapper.createObjectNode();
            notification.put("type", "USER_LEFT");
            notification.set("user", objectMapper.valueToTree(userDTO));
            
            // Broadcast to all users in the room except the user who left
            broadcastToRoom(roomId, new TextMessage(notification.toString()), excludeUserId);
        } catch (Exception e) {
            log.error("Error sending user left notification", e);
        }
    }
    
    /**
     * Broadcast a message to all users in a room, optionally excluding one user
     */
    private void broadcastToRoom(Long roomId, TextMessage message, Long excludeUserId) {
        Map<Long, WebSocketSession> roomSessionMap = roomSessions.get(roomId);
        if (roomSessionMap == null || roomSessionMap.isEmpty()) {
            log.debug("No sessions in room {}", roomId);
            return;
        }
        
        roomSessionMap.forEach((userId, session) -> {
            if (excludeUserId == null || !userId.equals(excludeUserId)) {
                try {
                    if (session.isOpen()) {
                        session.sendMessage(message);
                    }
                } catch (IOException e) {
                    log.error("Error sending message to session {}", session.getId(), e);
                }
            }
        });
    }
    
    /**
     * Extract path variables from WebSocket URL
     */
    private Map<String, String> extractPathVariables(String path) {
        Map<String, String> result = new ConcurrentHashMap<>();
        
        // Expected format: /ws/chat/{roomId}
        String[] segments = path.split("/");
        if (segments.length >= 4) {
            result.put("roomId", segments[3]);
        }
        
        return result;
    }
    
    /**
     * Extract query parameters from WebSocket URL
     */
    private Map<String, String> extractQueryParams(String query) {
        Map<String, String> result = new ConcurrentHashMap<>();
        
        if (query == null || query.isEmpty()) {
            return result;
        }
        
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            String[] keyValue = pair.split("=");
            if (keyValue.length == 2) {
                result.put(keyValue[0], keyValue[1]);
            }
        }
        
        return result;
    }
}