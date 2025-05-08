package com.epic7.backend.controller;

import com.epic7.backend.dto.ChatMessageBatchDTO;
import com.epic7.backend.dto.ChatMessageDTO;
import com.epic7.backend.dto.ChatRoomDTO;
import com.epic7.backend.dto.ResponseDTO;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.ChatService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Null;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

/**
 * Controller for chat-related endpoints
 */
@RestController
@RequestMapping("/api/chat")
@Slf4j
public class ChatController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final ChatService chatService;
    
    // Error codes constants
    private static final String ERROR_INVALID_INPUT = "CHAT_INVALID_INPUT";
    private static final String ERROR_NOT_FOUND = "CHAT_NOT_FOUND";
    private static final String ERROR_PERMISSION_DENIED = "CHAT_PERMISSION_DENIED";
    private static final String ERROR_SERVER = "INTERNAL_SERVER_ERROR";
    
    // Success code constants
    private static final String SUCCESS_CREATED = "CHAT_CREATED";
    private static final String SUCCESS_SENT = "MESSAGE_SENT";
    private static final String SUCCESS_DELETED = "MESSAGE_DELETED";
    private static final String SUCCESS_DATA_RETRIEVED = "CHAT_DATA_RETRIEVED";

    public ChatController(JwtUtil jwtUtil, AuthService authService, ChatService chatService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.chatService = chatService;
    }
    
    /**
     * Extracts user from JWT token
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }
    
    /**
     * Get all chat rooms the current user has access to
     */
    @GetMapping("/rooms")
    public ResponseEntity<ResponseDTO> getUserChatRooms(HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            List<ChatRoom> rooms = chatService.getUserChatRooms(user.getId());
            
            // Convert to DTOs with user context
            List<ChatRoomDTO> roomDTOs = rooms.stream()
                .map(room -> ChatRoomDTO.fromEntity(room, user.getId()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Chat rooms retrieved successfully",
                roomDTOs
            ));
        } catch (Exception e) {
            log.error("Error getting chat rooms", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while retrieving chat rooms"));
        }
    }
    
    /**
     * Get recent messages for a chat room
     */
    @GetMapping("/messages/{roomId}")
    public ResponseEntity<ResponseDTO> getRecentMessages(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "20") int limit) {
        
        try {
            User user = getCurrentUser(request);
            List<ChatMessage> messages = chatService.getRecentMessages(roomId, user.getId(), limit);
            
            // Convert to DTOs with user context
            List<ChatMessageDTO> messageDTOs = messages.stream()
                .map(message -> ChatMessageDTO.fromEntity(message, user.getId()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Messages retrieved successfully",
                messageDTOs
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting chat messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while retrieving messages"));
        }
    }
    
    /**
     * Get recent messages for a chat room - ADDED TO MATCH FRONTEND URL PATTERN
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<ResponseDTO> getRoomMessages(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "20") int limit) {
        
        try {
            User user = getCurrentUser(request);
            List<ChatMessage> messages = chatService.getRecentMessages(roomId, user.getId(), limit);
            
            // Convert to DTOs with user context
            List<ChatMessageDTO> messageDTOs = messages.stream()
                .map(message -> ChatMessageDTO.fromEntity(message, user.getId()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Messages retrieved successfully",
                messageDTOs
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting chat messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while retrieving messages"));
        }
    }
    
    /**
     * Check if the current user is an admin of a chat room
     */
    @GetMapping("/rooms/{roomId}/isAdmin")
    public ResponseEntity<ResponseDTO> isUserAdmin(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            boolean isAdmin = chatService.isUserChatRoomAdmin(roomId, user.getId());
            
            Map<String, Boolean> result = new HashMap<>();
            result.put("isAdmin", isAdmin);
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Admin status retrieved successfully",
                result
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            log.error("Error checking admin status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while checking admin status"));
        }
    }
    
    /**
     * Get paginated messages for a chat room with efficient batching
     */
    @GetMapping("/messages/{roomId}/paged")
    public ResponseEntity<ResponseDTO> getPagedMessages(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestParam(required = false) Long lastMessageId,
            @RequestParam(defaultValue = "20") int pageSize) {
        
        try {
            User user = getCurrentUser(request);
            
            // Get messages using pagination parameters
            List<ChatMessage> messages = lastMessageId != null 
                ? chatService.getRecentMessages(roomId, user.getId(), pageSize) : null;
            
            // Check if there are more messages available
            boolean hasMore = messages.size() >= pageSize;
            
            // Convert to batch DTO with user context
            ChatMessageBatchDTO batchDTO = ChatMessageBatchDTO.fromEntities(messages, hasMore);
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Messages retrieved successfully",
                batchDTO
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting paged chat messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while retrieving messages"));
        }
    }
    
    /**
     * Send a message to a chat room (REST endpoint for non-websocket clients)
     */
    @PostMapping("/send")
    public ResponseEntity<ResponseDTO> sendMessage(
            HttpServletRequest request,
            @RequestParam Long roomId,
            @RequestParam String content) {
        
        try {
            User user = getCurrentUser(request);
            ChatMessage message = chatService.sendMessage(user, roomId, content);
            
            // Convert to DTO
            ChatMessageDTO messageDTO = ChatMessageDTO.fromEntity(message, user.getId());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_SENT,
                "Message sent successfully",
                messageDTO
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error sending message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while sending the message"));
        }
    }
    
    /**
     * Send a batch of messages at once (useful for initial load after offline period)
     */
    @PostMapping("/send/batch")
    public ResponseEntity<ResponseDTO> sendMessageBatch(
            HttpServletRequest request,
            @RequestBody List<ChatMessageDTO> messageDTOs) {
        
        try {
            User user = getCurrentUser(request);
            
            // Process each message in the batch
            List<ChatMessage> processedMessages = chatService.processBatchMessages(user, messageDTOs);
            
            // Convert back to DTOs
            List<ChatMessageDTO> responseMessages = processedMessages.stream()
                .map(message -> ChatMessageDTO.fromEntity(message, user.getId()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_SENT,
                String.format("%d messages processed successfully", responseMessages.size()),
                responseMessages
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error processing message batch", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while processing message batch"));
        }
    }
    
    /**
     * Mark messages as read up to a specific message ID
     */
    @PostMapping("/messages/{roomId}/read")
    public ResponseEntity<ResponseDTO> markMessagesAsRead(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestParam Long lastReadMessageId) {
        
        try {
            User user = getCurrentUser(request);
            int updatedCount = chatService.markMessagesAsRead(roomId, user.getId(), lastReadMessageId);
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                String.format("%d messages marked as read", updatedCount),
                updatedCount
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            log.error("Error marking messages as read", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while marking messages as read"));
        }
    }
    
    /**
     * Delete a message
     */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<ResponseDTO> deleteMessage(
            HttpServletRequest request,
            @PathVariable Long messageId) {
        
        try {
            User user = getCurrentUser(request);
            boolean deleted = chatService.deleteMessage(messageId, user.getId());
            
            if (deleted) {
                return ResponseEntity.ok(ResponseDTO.success(
                    SUCCESS_DELETED,
                    "Message deleted successfully"
                ));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, "You do not have permission to delete this message"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            log.error("Error deleting message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while deleting the message"));
        }
    }
    
    /**
     * Connect to a chat room
     */
    @PostMapping("/rooms/{roomId}/connect")
    public ResponseEntity<ResponseDTO> connectToRoom(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            boolean connected = chatService.connectUserToChatRoom(roomId, user.getId());
            
            if (connected) {
                ChatRoom room = chatService.getChatRoomById(roomId);
                ChatRoomDTO roomDTO = ChatRoomDTO.fromEntity(room, user.getId());
                
                return ResponseEntity.ok(ResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED,
                    "Connected to chat room successfully",
                    roomDTO
                ));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ResponseDTO.error(ERROR_PERMISSION_DENIED, "You do not have permission to access this chat room"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            log.error("Error connecting to chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while connecting to the chat room"));
        }
    }

    /**
     * Get the global chat room (creates it if it doesn't exist)
     */
    @GetMapping("/rooms/global")
    public ResponseEntity<ResponseDTO> getGlobalChatRoom(HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            
            // Find global chat room or create one if it doesn't exist
            List<ChatRoom> globalRooms = chatService.findChatRoomsByType(ChatType.GLOBAL);
            ChatRoom globalRoom = null;
            
            if (globalRooms.isEmpty()) {
                // Create global chat room if it doesn't exist
                globalRoom = chatService.createGlobalChatRoom("Global Chat");
                log.info("Created new global chat room with ID: {}", globalRoom.getId());
            } else {
                // Use the first global room found
                globalRoom = globalRooms.get(0);
                log.debug("Found existing global chat room with ID: {}", globalRoom.getId());
            }
            
            // Connect user to chat room
            chatService.connectUserToChatRoom(globalRoom.getId(), user.getId());
            
            // Convert to DTO with user context
            ChatRoomDTO roomDTO = ChatRoomDTO.fromEntity(globalRoom, user.getId());
            
            return ResponseEntity.ok(ResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Global chat room retrieved successfully",
                roomDTO
            ));
        } catch (Exception e) {
            log.error("Error getting global chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseDTO.error(ERROR_SERVER, "An error occurred while retrieving global chat room"));
        }
    }
}
