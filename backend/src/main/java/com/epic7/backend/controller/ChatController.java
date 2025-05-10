package com.epic7.backend.controller;

import com.epic7.backend.dto.ApiResponseDTO;
import com.epic7.backend.dto.chatroom.ChatMessageDTO;
import com.epic7.backend.dto.chatroom.ChatRoomDTO;
import com.epic7.backend.dto.chatroom.DeleteMessageDTO;
import com.epic7.backend.dto.chatroom.TypingDTO;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.ChatService;
import com.epic7.backend.utils.JwtUtil;
import com.epic7.backend.model.enums.ChatType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.Optional;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for handling WebSocket chat messages using STOMP.
 * Handles global chat, guild chat, and duel chat.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    
    // Error codes constants
    private static final String ERROR_CHAT_ROOM_NOT_FOUND = "CHAT_ROOM_NOT_FOUND";
    private static final String ERROR_CHAT_ROOM_ERROR = "CHAT_ROOM_ERROR";
    private static final String ERROR_MISSING_GROUP_ID = "MISSING_GROUP_ID";
    private static final String ERROR_INVALID_ROOM_TYPE = "INVALID_ROOM_TYPE";
    private static final String ERROR_MESSAGE_NOT_FOUND = "MESSAGE_NOT_FOUND";
    private static final String ERROR_DELETE_FAILED = "DELETE_FAILED";
    private static final String ERROR_SERVER = "INTERNAL_SERVER_ERROR";
    
    // Success code constants
    private static final String SUCCESS_CHAT_ROOM_FOUND = "CHAT_ROOM_FOUND";
    private static final String SUCCESS_MESSAGES_FOUND = "MESSAGES_FOUND";
    private static final String SUCCESS_MESSAGE_SENT = "MESSAGE_SENT";
    private static final String SUCCESS_MESSAGE_DELETED = "MESSAGE_DELETED";
    private static final String SUCCESS_CHAT_ROOMS_FOUND = "CHAT_ROOMS_FOUND";

    // ========== REST API ENDPOINTS ==========

    /**
     * Get the global chat room (creates it if it doesn't exist)
     */
    @GetMapping("/rooms/global")
    public ResponseEntity<ApiResponseDTO> getGlobalChatRoom(HttpServletRequest request) {
        log.info("Getting global chat room");
        User user = getUserFromRequest(request);
        
        // Get or create the global chat room
        ChatRoom globalRoom = chatService.getOrCreateGlobalChatRoom();
        
        if (globalRoom == null) {
            return ResponseEntity.badRequest().body(
                ApiResponseDTO.error(ERROR_CHAT_ROOM_ERROR, "Could not retrieve global chat room")
            );
        }
        
        return ResponseEntity.ok(
            ApiResponseDTO.success(SUCCESS_CHAT_ROOM_FOUND, "Global chat room retrieved successfully", 
                ChatRoomDTO.fromEntity(globalRoom))
        );
    }
    
    /**
     * Get a chat room by type and optional group ID
     */
    @GetMapping("/rooms/by-type")
    public ResponseEntity<ApiResponseDTO> getChatRoomByType(
            @RequestParam("type") String type,
            @RequestParam(value = "groupId", required = false) Long groupId,
            HttpServletRequest request) {
        
        log.info("Getting chat room by type: {} and groupId: {}", type, groupId);
        User user = getUserFromRequest(request);
        
        ChatRoom chatRoom;
        try {
            ChatType roomType = ChatType.valueOf(type.toUpperCase());
            
            if (roomType == ChatType.GLOBAL) {
                chatRoom = chatService.getOrCreateGlobalChatRoom();
            } else {
                if (groupId == null) {
                    return ResponseEntity.badRequest().body(
                        ApiResponseDTO.error(ERROR_MISSING_GROUP_ID, "Group ID is required for non-global chat rooms")
                    );
                }
                
                chatRoom = chatService.getOrCreateChatRoomByTypeAndGroupId(roomType, groupId);
            }
            
            if (chatRoom == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponseDTO.error(ERROR_CHAT_ROOM_ERROR, "Could not retrieve chat room")
                );
            }
            
            return ResponseEntity.ok(
                ApiResponseDTO.success(SUCCESS_CHAT_ROOM_FOUND, "Chat room retrieved successfully", 
                    ChatRoomDTO.fromEntity(chatRoom))
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                ApiResponseDTO.error(ERROR_INVALID_ROOM_TYPE, "Invalid chat room type: " + type)
            );
        } catch (Exception e) {
            log.error("Error retrieving chat room", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération du salon de discussion."));
        }
    }
    
    /**
     * Get messages for a specific chat room
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ApiResponseDTO> getChatMessages(
            @PathVariable("roomId") Long roomId,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            HttpServletRequest request) {
        
        log.info("Getting messages for room ID: {} with limit: {}", roomId, limit);
        User user = getUserFromRequest(request);
        
        try {
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            if (chatRoom == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponseDTO.error(ERROR_CHAT_ROOM_NOT_FOUND, "Chat room not found")
                );
            }
            
            List<ChatMessage> messages = chatService.getChatRoomMessages(roomId, limit);
            List<ChatMessageDTO> messageDTOs = messages.stream()
                    .map(ChatMessageDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(
                ApiResponseDTO.success(SUCCESS_MESSAGES_FOUND, "Messages retrieved successfully", messageDTOs)
            );
        } catch (Exception e) {
            log.error("Error retrieving chat messages", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des messages."));
        }
    }
    
    /**
     * Send a message via REST API (fallback for when WebSocket is not available)
     */
    @PostMapping("/send")
    public ResponseEntity<ApiResponseDTO> sendMessageRest(
            @RequestParam("roomId") Long roomId,
            @RequestParam("content") String content,
            HttpServletRequest request) {
        
        log.info("Sending message via REST API to room: {}", roomId);
        User user = getUserFromRequest(request);
        
        try {
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            if (chatRoom == null) {
                return ResponseEntity.badRequest().body(
                    ApiResponseDTO.error(ERROR_CHAT_ROOM_NOT_FOUND, "Chat room not found")
                );
            }
            
            // Save message
            ChatMessage savedMessage = chatService.sendMessage(user, roomId, content);
            ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(savedMessage);
            
            // Also broadcast via WebSocket if possible - Important for real-time updates!
            try {
                String destination = getDestinationByRoomType(chatRoom);
                log.info("Broadcasting message to destination: {}", destination);
                messagingTemplate.convertAndSend(destination, messageDTO);
                
                // Also broadcast to global topic as a fallback to ensure all clients receive it
                // This is an additional safety measure
                if (!destination.equals("/topic/chat/global")) {
                    log.info("Also broadcasting to global as fallback");
                    messagingTemplate.convertAndSend("/topic/chat/global", messageDTO);
                }
            } catch (Exception e) {
                log.warn("Could not broadcast message via WebSocket: {}", e.getMessage(), e);
            }
            
            return ResponseEntity.ok(
                ApiResponseDTO.success(SUCCESS_MESSAGE_SENT, "Message sent successfully", messageDTO)
            );
        } catch (Exception e) {
            log.error("Error sending message", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de l'envoi du message."));
        }
    }
    
    /**
     * Delete a message via REST API (fallback for when WebSocket is not available)
     */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ApiResponseDTO> deleteMessageRest(
            @PathVariable("messageId") Long messageId,
            HttpServletRequest request) {
        
        log.info("Deleting message via REST API: {}", messageId);
        User user = getUserFromRequest(request);
        
        try {
            boolean deleted = chatService.deleteMessage(messageId, user.getId());
            
            if (deleted) {
                // Try to broadcast deletion via WebSocket if possible
                ChatMessage message = chatService.getChatMessageById(messageId);
                if (message != null) {
                    ChatRoom chatRoom = chatService.getChatRoomById(message.getChatRoom().getId());
                    if (chatRoom != null) {
                        try {
                            String destination = getDestinationByRoomType(chatRoom) + "/delete";
                            String uniqueId = request.getParameter("uniqueId");
                            log.info("REST delete - Broadcasting via WebSocket to {} for message ID {}, uniqueId: {}", 
                                destination, messageId, uniqueId);
                            
                            // Include user who performed the delete operation along with the message's original sender info
                            DeleteMessageDTO deleteDTO = new DeleteMessageDTO(
                                messageId, 
                                chatRoom.getId(),
                                user.getUsername(),
                                user.getId(),
                                uniqueId, // Get uniqueId from request parameters if available
                                "delete" // Explicitly set the type
                            );
                            messagingTemplate.convertAndSend(destination, deleteDTO);
                            log.info("REST delete - Successfully broadcasted delete event for message ID: {}", messageId);
                        } catch (Exception e) {
                            log.error("REST delete - Could not broadcast message deletion via WebSocket: {}", e.getMessage(), e);
                        }
                    } else {
                        log.warn("REST delete - Chat room not found for message {}. Delete event not broadcasted.", messageId);
                    }
                } else {
                    log.warn("REST delete - Message with ID {} not found for WebSocket broadcast, but was reported as deleted.", messageId);
                }
                
                return ResponseEntity.ok(
                    ApiResponseDTO.success(SUCCESS_MESSAGE_DELETED, "Message deleted successfully", true)
                );
            } else {
                return ResponseEntity.badRequest().body(
                    ApiResponseDTO.error(ERROR_DELETE_FAILED, "Could not delete message")
                );
            }
        } catch (Exception e) {
            log.error("Error deleting message", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la suppression du message."));
        }
    }
    
    /**
     * Get all available chat rooms for the authenticated user
     */
    @GetMapping("/rooms")
    public ResponseEntity<ApiResponseDTO> getAllChatRooms(HttpServletRequest request) {
        log.info("Getting all chat rooms");
        User user = getUserFromRequest(request);
        
        try {
            List<ChatRoom> chatRooms = chatService.getAllChatRoomsForUser(user.getId());
            List<ChatRoomDTO> chatRoomDTOs = chatRooms.stream()
                    .map(ChatRoomDTO::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(
                ApiResponseDTO.success(SUCCESS_CHAT_ROOMS_FOUND, "Chat rooms retrieved successfully", chatRoomDTOs)
            );
        } catch (Exception e) {
            log.error("Error retrieving chat rooms", e);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des salons de discussion."));
        }
    }
    
    /**
     * Helper method to extract the authenticated user from the request
     */
    private User getUserFromRequest(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    // ========== WEBSOCKET MESSAGE HANDLERS ==========

    /**
     * Handles sending chat messages to the appropriate chat room.
     * 
     * @param message The chat message
     * @param principal The authenticated user (can be null when sent from REST API)
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessageDTO message, Principal principal) {
        // Handle the case where principal is null (message from REST API or unauthenticated)
        if (principal == null) {
            log.warn("Received message without principal (possibly from REST API): {}", message);
            return; // Skip processing WebSocket messages without authentication
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
            return;
        }
        
        // Save message to database
        ChatMessage savedMessage = chatService.sendMessage(user, roomId, message.getContent());
        
        // Convert to DTO for sending back to clients
        ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(savedMessage);
        
        // Send to the appropriate destination based on chat room type
        String destination = getDestinationByRoomType(chatRoom);
        messagingTemplate.convertAndSend(destination, messageDTO);
    }

    /**
     * Handles typing status updates.
     * 
     * @param typing The typing status
     * @param principal The authenticated user (can be null in some cases)
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
     * Handles message deletion.
     * 
     * @param deleteMessage The delete message request
     * @param principal The authenticated user (can be null in some cases)
     */
    @MessageMapping("/chat.deleteMessage")
    public void deleteMessage(@Payload DeleteMessageDTO deleteMessage, Principal principal) {
        // Log all details of the delete request for debugging
        log.info("Received delete request: messageId={}, roomId={}, uniqueId={}, type={}, sender={}",
                deleteMessage.getMessageId(), deleteMessage.getRoomId(), 
                deleteMessage.getUniqueId(), "delete", deleteMessage.getSender());
                
        // Handle the case where principal is null
        if (principal == null) {
            log.warn("Received delete request without principal: {}", deleteMessage);
            
            // Try to proceed with deletion if askerId is provided
            if (deleteMessage.getAskerId() != null) {
                log.info("Attempting to proceed with deletion using askerId: {}", deleteMessage.getAskerId());
                User requester = userRepository.findById(deleteMessage.getAskerId()).orElse(null);
                if (requester != null) {
                    processDeletion(deleteMessage, requester);
                    return;
                }
            }
            
            // Try to proceed with deletion if sender is provided
            if (deleteMessage.getSender() != null && !deleteMessage.getSender().isEmpty()) {
                log.info("Attempting to proceed with deletion using sender name: {}", deleteMessage.getSender());
                Optional<User> requesterOpt = userRepository.findByUsername(deleteMessage.getSender());
                if (requesterOpt.isPresent()) {
                    processDeletion(deleteMessage, requesterOpt.get());
                    return;
                }
            }
            
            log.error("Cannot process delete request: no valid authentication or sender information");
            return; // Skip processing delete updates without any authentication
        }
        
        log.info("Delete message request from {}: message ID {}", principal.getName(), deleteMessage.getMessageId());
        
        User user = authService.getUserByEmail(principal.getName());
        if (user == null) {
            log.warn("User not found for email: {}", principal.getName());
            return;
        }
        
        processDeletion(deleteMessage, user);
    }
    
    /**
     * Process the actual message deletion and broadcast
     * 
     * @param deleteMessage The delete message DTO
     * @param user The user requesting deletion
     */
    private void processDeletion(DeleteMessageDTO deleteMessage, User user) {
        // First check if the message exists before attempting to delete it
        ChatMessage message = null;
        try {
            message = chatService.getChatMessageById(deleteMessage.getMessageId());
            if (message == null) {
                // Message already deleted, just broadcast the deletion event
                log.info("Message with ID {} was already deleted, skipping deletion and proceeding to broadcast", 
                    deleteMessage.getMessageId());
                
                // Get the chat room directly from the DTO since we don't have the message anymore
                ChatRoom chatRoom = chatService.getChatRoomById(deleteMessage.getRoomId());
                if (chatRoom != null) {
                    broadcastDeletionEvent(deleteMessage, user, chatRoom);
                } else {
                    log.warn("Chat room with ID {} not found for broadcasting delete event", deleteMessage.getRoomId());
                }
                return;
            }
        } catch (Exception e) {
            log.warn("Error checking message existence before deletion: {}", e.getMessage());
            // Continue with normal flow, the deleteMessage method will handle exceptions
        }
        
        // Try to delete the message
        boolean deleted = false;
        try {
            deleted = chatService.deleteMessage(deleteMessage.getMessageId(), user.getId());
        } catch (IllegalArgumentException e) {
            // Message not found, consider it already deleted
            log.info("Message with ID {} was already deleted by someone else", deleteMessage.getMessageId());
            deleted = true; // Consider it successfully deleted since it's gone
        } catch (Exception e) {
            log.error("Error deleting message: {}", e.getMessage());
            return; // Stop processing if other errors occur
        }
        
        if (deleted) {
            // If deletion was successful, broadcast to all users in the chat room
            Long roomId = deleteMessage.getRoomId();
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            
            if (chatRoom != null) {
                broadcastDeletionEvent(deleteMessage, user, chatRoom);
            } else {
                log.warn("Chat room not found for ID: {}. Delete event not broadcasted.", roomId);
            }
        } else {
            log.warn("User {} not authorized to delete message {}", user.getUsername(), deleteMessage.getMessageId());
        }
    }
    
    /**
     * Helper method to broadcast a message deletion event
     */
    private void broadcastDeletionEvent(DeleteMessageDTO deleteMessage, User user, ChatRoom chatRoom) {
        try {
            // Get destination topic based on chat room type
            String destination = getDestinationByRoomType(chatRoom) + "/delete";
            
            log.info("Broadcasting delete event to {} for message ID {}, uniqueId: {}, sender: {}", 
                destination, deleteMessage.getMessageId(), deleteMessage.getUniqueId(), user.getUsername());
            
            // Update sender in the DTO if it's not already set
            if (deleteMessage.getSender() == null || deleteMessage.getSender().isEmpty()) {
                deleteMessage.setSender(user.getUsername());
            }
            
            // Ensure type is set for consistency
            deleteMessage.setType("delete");
            
            // Create a new simplified DTO to ensure consistent format
            DeleteMessageDTO broadcastDTO = new DeleteMessageDTO(
                deleteMessage.getMessageId(),
                deleteMessage.getRoomId(),
                user.getUsername(),  // Always use the authenticated user's username
                null,                // Don't expose askerId in broadcasts
                deleteMessage.getUniqueId(),
                "delete"             // Always set explicit type
            );
            
            // Send to the appropriate topic
            messagingTemplate.convertAndSend(destination, broadcastDTO);
            
            log.info("Successfully broadcasted delete event for message ID: {} to {}", 
                deleteMessage.getMessageId(), destination);
        } catch (Exception e) {
            log.error("Error broadcasting delete event: {}", e.getMessage(), e);
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
}

