package com.epic7.backend.controller;

import com.epic7.backend.dto.chatroom.ChatMessageDTO;
import com.epic7.backend.dto.chatroom.ChatRoomDTO;
import com.epic7.backend.dto.chatroom.DeleteMessageDTO;
import com.epic7.backend.dto.chatroom.TypingDTO;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.ChatService;
import com.epic7.backend.model.enums.ChatType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

/**
 * Controller for handling WebSocket chat messages using STOMP.
 * Handles global chat, guild chat, and duel chat.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final AuthService authService;

    /**
     * Handles sending chat messages to the appropriate chat room.
     *
     * @param message The chat message
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageDTO message, Principal principal) {
        // Require authentication for message sending
        if (principal == null) {
            log.error("Rejected unauthenticated message: {}", message);
            return; // Reject the request without authentication
        }
        
        log.info("Received message from {}: {}", principal.getName(), message);
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            log.error("Unable to find user for principal: {}", principal.getName());
            return;
        }
        
        Long roomId = message.getRoomId();
        ChatRoom chatRoom = chatService.getChatRoomById(roomId);
        
        if (chatRoom == null) {
            log.error("Chat room with ID {} not found", roomId);
            // Send error response back to the sender
            try {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(), 
                    "/queue/errors", 
                    Map.of("error", "CHAT_ROOM_NOT_FOUND", "message", "Chat room not found")
                );
            } catch (Exception e) {
                log.error("Error sending error response", e);
            }
            return;
        }
        
        // Check access rights
        if (!chatService.canUserAccessChat(user.getId(), chatRoom)) {
            log.error("User {} does not have access to chat room {}", user.getUsername(), roomId);
            // Send error response back to the sender
            try {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(), 
                    "/queue/errors", 
                    Map.of("error", "ACCESS_DENIED", "message", "You don't have access to this chat room")
                );
            } catch (Exception e) {
                log.error("Error sending error response", e);
            }
            return;
        }
        
        try {
            // Save message to database
            ChatMessage savedMessage = chatService.sendMessage(user, roomId, message.getContent());
            
            // Convert to DTO for sending back to clients
            ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(savedMessage);

            // Send to the appropriate destination based on chat room type
            String destination = getDestinationByRoomType(chatRoom);
            messagingTemplate.convertAndSend(destination, messageDTO);
            
            // Also send a confirmation to the sender
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/confirm",
                Map.of(
                    "status", "SUCCESS",
                    "message", "Message sent successfully",
                    "messageId", savedMessage.getId()
                )
            );
        } catch (Exception e) {
            log.error("Error sending message", e);
            // Send error response back to the sender
            try {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(), 
                    "/queue/errors", 
                    Map.of("error", "SEND_FAILED", "message", "Failed to send message: " + e.getMessage())
                );
            } catch (Exception ex) {
                log.error("Error sending error response", ex);
            }
        }
    }

    /**
     * Handles typing status updates.
     * 
     * @param typing The typing status
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingDTO typing, Principal principal) {
        // Handle the case where principal is null
        if (principal == null) {
            log.warn("Received typing status without principal: {}", typing);
            return; // Skip processing typing updates without authentication
        }
        
        log.debug("User {} typing status: {}", principal.getName(), typing.isTyping());
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            return;
        }
        
        // Create a typing DTO with the username
        TypingDTO typingStatus = new TypingDTO(user.getUsername(), typing.isTyping(), typing.getRoomId());
        
        // Broadcast typing status to all users in the appropriate chat room
        Long roomId = typing.getRoomId();
        if (roomId != null) {
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            if (chatRoom != null) {
                String destination = getDestinationByRoomType(chatRoom) + "/typing";
                messagingTemplate.convertAndSend(destination, typingStatus);
            }
        }
    }

    /**
     * Handles message deletion via Map payload (for direct WebSocket calls from frontend)
     * This is an alternative to the DeleteMessageDTO method to support direct WebSocket calls
     * with simple JSON objects.
     * 
     * @param request The request containing message details
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.deleteMessageDirect")
    public void deleteMessageDirect(@Payload Map<String, Object> request, Principal principal) {
        if (principal == null) {
            log.error("Rejected unauthenticated message deletion request");
            return;
        }
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            log.warn("User not found for email: {}", principal.getName());
            return;
        }
        
        try {
            // Extract values from the request map
            String messageIdStr = request.get("messageId") != null ? request.get("messageId").toString() : null;
            String roomIdStr = request.get("roomId") != null ? request.get("roomId").toString() : null;
            
            if (messageIdStr == null || roomIdStr == null) {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat/delete",
                    Map.of(
                        "error", "INVALID_REQUEST",
                        "message", "Message ID and Room ID are required"
                    )
                );
                return;
            }
            
            // Convert to proper types
            Long messageId = Long.valueOf(messageIdStr);
            Long roomId = Long.valueOf(roomIdStr);
            
            log.info("Direct delete message request: messageId={}, roomId={}, user={}", 
                    messageId, roomId, principal.getName());
            
            // Create DeleteMessageDTO and process
            DeleteMessageDTO deleteMessage = new DeleteMessageDTO();
            deleteMessage.setMessageId(messageId);
            deleteMessage.setRoomId(roomId);
            deleteMessage.setSender(principal.getName());
            deleteMessage.setAskerId(user.getId());
            
            // Process deletion
            boolean deleted = chatService.deleteMessage(messageId, user.getId());
            
            if (deleted) {
                // Send confirmation to the user who deleted the message
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat/delete",
                    Map.of(
                        "status", "SUCCESS",
                        "message", "Message deleted successfully",
                        "messageId", messageId,
                        "roomId", roomId
                    )
                );
                
                // Get the chat room
                ChatRoom chatRoom = chatService.getChatRoomById(roomId);
                if (chatRoom != null) {
                    // Broadcast deletion notification to all users in the room
                    messagingTemplate.convertAndSend(
                        "/topic/chat.room." + roomId,
                        Map.of(
                            "type", "MESSAGE_DELETED",
                            "messageId", messageId.toString(),
                            "roomId", roomId.toString()
                        )
                    );
                }
            } else {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat/delete",
                    Map.of(
                        "error", "DELETE_FAILED",
                        "message", "Failed to delete the message"
                    )
                );
            }
        } catch (NumberFormatException e) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/delete",
                Map.of(
                    "error", "INVALID_FORMAT",
                    "message", "Invalid message ID or room ID format"
                )
            );
        } catch (Exception e) {
            log.error("Error deleting message: {}", e.getMessage(), e);
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/delete",
                Map.of(
                    "error", "INTERNAL_SERVER_ERROR",
                    "message", "An error occurred while deleting the message: " + e.getMessage()
                )
            );
        }
    }
    
    /**
     * Determines the appropriate destination topic based on the chat room type.
     * 
     * @param chatRoom The chat room
     * @return The destination topic
     */
    private String getDestinationByRoomType(ChatRoom chatRoom) {
        if (chatRoom == null) {
            return "/topic/chat/global"; // Default fallback
        }
        
        switch (chatRoom.getType()) {
            case GLOBAL:
                return "/topic/chat/global";
            case GUILD:
                return "/topic/chat/guild." + chatRoom.getGroupId();
            case FIGHT:
                return "/topic/chat/duel." + chatRoom.getGroupId();
            default:
                return "/topic/chat/global";
        }
    }

    /**
     * Handles requests for retrieving a chat room.
     * Supports global and guild chat rooms.
     * 
     * @param request The request DTO containing room details
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.getRoom")
    @Transactional
    public void getChatRoom(@Payload Map<String, Object> request, Principal principal) {
        if (principal == null) {
            log.error("Rejected unauthenticated room request");
            return;
        }
        
        log.info("Chat room request from {}: {}", principal.getName(), request);
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            log.warn("User not found for email: {}", principal.getName());
            return;
        }
        
        String type = (String) request.get("type");
        Long groupId = null;
        if (request.get("groupId") != null) {
            try {
                groupId = Long.valueOf(request.get("groupId").toString());
            } catch (NumberFormatException e) {
                log.warn("Invalid groupId format: {}", request.get("groupId"));
            }
        }
        
        String responseQueue = "/queue/chat/rooms";
        
        try {
            ChatRoom chatRoom = null;
            
            if ("GLOBAL".equalsIgnoreCase(type)) {
                // Get or create global chat room
                chatRoom = chatService.getOrCreateGlobalChatRoom();
                
                // If getting global room, make sure to fetch with user IDs loaded
                if (chatRoom != null) {
                    chatRoom = chatService.getChatRoomById(chatRoom.getId());
                }
            } else if (type != null && groupId != null) {
                // For other types, we need the group ID
                try {
                    ChatType chatType = ChatType.valueOf(type.toUpperCase());
                    chatRoom = chatService.getOrCreateChatRoomByTypeAndGroupId(chatType, groupId);
                    
                    // Make sure to fetch with user IDs loaded
                    if (chatRoom != null) {
                        chatRoom = chatService.getChatRoomById(chatRoom.getId());
                    }
                } catch (IllegalArgumentException e) {
                    messagingTemplate.convertAndSendToUser(
                        principal.getName(),
                        responseQueue,
                        Map.of(
                            "error", "INVALID_TYPE",
                            "message", "Invalid chat room type: " + type
                        )
                    );
                    return;
                }
            } else {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    responseQueue,
                    Map.of(
                        "error", "INVALID_REQUEST",
                        "message", "Invalid chat room request parameters"
                    )
                );
                return;
            }
            
            if (chatRoom == null) {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    responseQueue,
                    Map.of(
                        "error", "CHAT_ROOM_ERROR",
                        "message", "Could not retrieve chat room"
                    )
                );
                return;
            }
            
            // Convert to DTO and send back to the user
            ChatRoomDTO chatRoomDTO = ChatRoomDTO.fromEntity(chatRoom);
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                responseQueue,
                Map.of(
                    "status", "SUCCESS",
                    "message", "Chat room retrieved successfully",
                    "data", chatRoomDTO
                )
            );
            
        } catch (Exception e) {
            log.error("Error retrieving chat room: {}", e.getMessage(), e);
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                responseQueue,
                Map.of(
                    "error", "INTERNAL_SERVER_ERROR",
                    "message", "An error occurred while retrieving the chat room: " + e.getMessage()
                )
            );
        }
    }

    /**
     * Handles requests for retrieving messages from a chat room.
     * 
     * @param request The request containing roomId and limit
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.getMessages")
    @Transactional
    public void getChatMessages(@Payload Map<String, Object> request, Principal principal) {
        if (principal == null) {
            log.error("Rejected unauthenticated message retrieval request");
            return;
        }
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            log.warn("User not found for email: {}", principal.getName());
            return;
        }
        
        Long roomId = null;
        if (request.get("roomId") != null) {
            try {
                roomId = Long.valueOf(request.get("roomId").toString());
            } catch (NumberFormatException e) {
                log.warn("Invalid roomId format: {}", request.get("roomId"));
            }
        }
        
        Integer limit = 50; // Default limit
        if (request.get("limit") != null) {
            try {
                limit = Integer.valueOf(request.get("limit").toString());
            } catch (NumberFormatException e) {
                log.warn("Invalid limit format: {}", request.get("limit"));
            }
        }
        
        if (roomId == null) {
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/messages",
                Map.of(
                    "error", "INVALID_REQUEST",
                    "message", "Room ID is required"
                )
            );
            return;
        }
        
        try {
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            if (chatRoom == null) {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat/messages",
                    Map.of(
                        "error", "CHAT_ROOM_NOT_FOUND",
                        "message", "Chat room not found"
                    )
                );
                return;
            }
            
            // Check access rights
            if (!chatService.canUserAccessChat(user.getId(), chatRoom)) {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/chat/messages",
                    Map.of(
                        "error", "ACCESS_DENIED",
                        "message", "You don't have access to this chat room"
                    )
                );
                return;
            }
            
            List<ChatMessage> messages = chatService.getRecentMessages(roomId, user.getId(), limit);
            List<ChatMessageDTO> messageDTOs = messages.stream()
                .map(message -> ChatMessageDTO.fromEntity(message))
                .collect(Collectors.toList());
            
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/messages",
                Map.of(
                    "status", "SUCCESS",
                    "message", "Messages retrieved successfully",
                    "data", messageDTOs
                )
            );
            
        } catch (Exception e) {
            log.error("Error retrieving chat messages for room {}: {}", roomId, e.getMessage(), e);
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/chat/messages",
                Map.of(
                    "error", "INTERNAL_SERVER_ERROR",
                    "message", "An error occurred while retrieving messages: " + e.getMessage()
                )
            );
        }
    }

    /**
     * Handles client clean disconnect notifications.
     * Allows clients to inform the server they're disconnecting intentionally.
     *
     * @param payload The disconnect payload with optional reason
     * @param principal The authenticated user
     */
    @MessageMapping("/chat.disconnect")
    public void handleDisconnect(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) {
            log.info("Received anonymous disconnect notification");
            return;
        }
        
        String reason = payload.getOrDefault("reason", "client_initiated");
        log.info("Received clean disconnect from {}, reason: {}", principal.getName(), reason);
        
        // You could perform additional cleanup here if needed,
        // such as updating user status, sending notifications to other users, etc.
        
        // We don't need to explicitly disconnect the user as Spring will handle
        // the WebSocket session cleanup automatically
    }

    /**
     * Subscribes to server shutdown events and notifies clients
     * This method will be called by a Spring EventListener
     */
    public void notifyClientsOfShutdown() {
        log.info("Notifying all connected chat clients of server shutdown");
        
        try {
            // Send a message to all connected clients
            messagingTemplate.convertAndSend(
                "/topic/chat/system", 
                Map.of(
                    "type", "SHUTDOWN",
                    "message", "Server is shutting down for maintenance. Please reconnect in a few minutes.",
                    "reconnectAfter", 30000 // Suggest clients wait 30 seconds before reconnecting
                )
            );
            
            // Also send to user queues to ensure delivery
            // This will be picked up by the client's error and message handlers
            messagingTemplate.convertAndSend(
                "/user/queue/chat/error", 
                Map.of(
                    "code", "SERVER_STOPPING",
                    "type", "SHUTDOWN",
                    "message", "Server is shutting down for maintenance. Please reconnect in a few minutes.",
                    "reconnectAfter", 30000
                )
            );
            
            log.info("Shutdown notifications sent to all chat clients");
        } catch (Exception e) {
            log.error("Error sending shutdown notifications", e);
        }
    }
}
