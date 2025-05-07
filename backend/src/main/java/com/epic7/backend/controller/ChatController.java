package com.epic7.backend.controller;

import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;
import com.epic7.backend.model.enums.GuildRole;
import com.epic7.backend.service.ChatService;
import com.epic7.backend.service.UserService;
import com.epic7.backend.service.GuildService;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.repository.ChatRoomRepository;
import com.epic7.backend.utils.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Controller handling chat operations such as sending messages,
 * creating chat rooms, and managing chat room users.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {
    
    private final ChatService chatService;
    private final GuildService guildService;
    private final ChatRoomRepository chatRoomRepository;
    private final JwtUtil jwtUtil;
    private final AuthService authService;

    /**
     * Utilitaire pour extraire l'utilisateur connecté via le token JWT dans les headers.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return L'utilisateur connecté.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Create a new chat room.
     * 
     * @param payload The chat room creation request containing room details
     * @return The created chat room
     */
    @PostMapping("/rooms")
    public ResponseEntity<?> createChatRoom(
            HttpServletRequest request,
            @RequestBody Map<String, Object> payload) {
        
        try {
            User user = getCurrentUser(request);
            String type = (String) payload.get("type");
            String name = (String) payload.get("name");
            Long groupId = null;
            
            if (payload.containsKey("groupId")) {
                groupId = Long.valueOf(String.valueOf(payload.get("groupId")));
            }
            
            ChatRoom chatRoom;
            
            if (ChatType.GLOBAL.name().equals(type)) {
                chatRoom = chatService.createGlobalChatRoom(name);
            } else if (ChatType.GUILD.name().equals(type) && groupId != null) {
                chatRoom = chatService.createGuildChatRoom(groupId);
            } else {
                return ResponseEntity.badRequest().body("Invalid chat room type or missing groupId");
            }
            
            // Connect the creator to the room
            chatService.connectUserToChatRoom(chatRoom.getId(), user.getId());
            
            return ResponseEntity.ok(chatRoom);
        } catch (Exception e) {
            log.error("Error creating chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating chat room: " + e.getMessage());
        }
    }
    
    /**
     * Get chat rooms for the current user.
     * 
     * @param request The HTTP request containing JWT token
     * @return List of chat rooms the user is a member of
     */
    @GetMapping("/rooms")
    public ResponseEntity<?> getUserChatRooms(HttpServletRequest request) {
        try {
            User user = getCurrentUser(request);
            List<ChatRoom> chatRooms = chatService.getUserChatRooms(user.getId());
            return ResponseEntity.ok(chatRooms);
        } catch (Exception e) {
            log.error("Error retrieving user chat rooms", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving chat rooms: " + e.getMessage());
        }
    }
    
    /**
     * Get a specific chat room by ID.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @return The chat room if the user has access
     */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<?> getChatRoomById(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            ChatRoom chatRoom = chatService.getChatRoomById(roomId);
            
            // Check if user has access to this chat room
            if (!chatRoom.getUserIds().contains(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have access to this chat room");
            }
            
            return ResponseEntity.ok(chatRoom);
        } catch (Exception e) {
            log.error("Error retrieving chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving chat room: " + e.getMessage());
        }
    }
    
    /**
     * Get messages for a specific chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @param limit Optional parameter to limit the number of messages (default 50)
     * @return List of messages
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getChatMessages(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestParam(required = false, defaultValue = "50") int limit) {
        
        try {
            User user = getCurrentUser(request);
            List<ChatMessage> messages = chatService.getRecentMessages(roomId, user.getId(), limit);
            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error retrieving chat messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving chat messages: " + e.getMessage());
        }
    }
    
    /**
     * Send a message to a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @param payload The message payload containing the content
     * @return The sent message
     */
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestBody Map<String, String> payload) {
        
        try {
            User user = getCurrentUser(request);
            String content = payload.get("content");
            
            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Message content cannot be empty");
            }
            
            ChatMessage message = chatService.sendMessage(user, roomId, content);
            return ResponseEntity.ok(message);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            log.error("Error sending message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error sending message: " + e.getMessage());
        }
    }
    
    /**
     * Delete a message.
     * 
     * @param request The HTTP request containing JWT token
     * @param messageId The ID of the message to delete
     * @return Success or failure response
     */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(
            HttpServletRequest request,
            @PathVariable Long messageId) {
        
        try {
            User user = getCurrentUser(request);
            boolean deleted = chatService.deleteMessage(messageId, user.getId());
            
            if (deleted) {
                return ResponseEntity.ok().body(Map.of("message", "Message deleted successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to delete this message");
            }
        } catch (Exception e) {
            log.error("Error deleting message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting message: " + e.getMessage());
        }
    }
    
    /**
     * Connect to a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @return Success or failure response
     */
    @PostMapping("/rooms/{roomId}/connect")
    public ResponseEntity<?> connectToChatRoom(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            Long userId = user.getId();
            
            boolean connected = chatService.connectUserToChatRoom(roomId, userId);
            
            if (connected) {
                return ResponseEntity.ok().body(Map.of("message", "Connected to chat room successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have access to this chat room");
            }
        } catch (Exception e) {
            log.error("Error connecting to chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error connecting to chat room: " + e.getMessage());
        }
    }
    
    /**
     * Disconnect from a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @return Success response
     */
    @PostMapping("/rooms/{roomId}/disconnect")
    public ResponseEntity<?> disconnectFromChatRoom(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            chatService.disconnectUserFromChatRoom(roomId, user.getId());
            return ResponseEntity.ok().body(Map.of("message", "Disconnected from chat room successfully"));
        } catch (Exception e) {
            log.error("Error disconnecting from chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error disconnecting from chat room: " + e.getMessage());
        }
    }
    
    /**
     * Check if the current user is an admin of a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @return Boolean indicating if the user is an admin
     */
    @GetMapping("/rooms/{roomId}/isAdmin")
    public ResponseEntity<?> isUserAdmin(
            HttpServletRequest request,
            @PathVariable Long roomId) {
        
        try {
            User user = getCurrentUser(request);
            boolean isAdmin = chatService.isUserAdmin(roomId, user.getId());
            return ResponseEntity.ok(Map.of("isAdmin", isAdmin));
        } catch (Exception e) {
            log.error("Error checking admin status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error checking admin status: " + e.getMessage());
        }
    }
    
    /**
     * Add a user as an admin to a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @param payload The payload containing the user ID to add as admin
     * @return Success or failure response
     */
    @PostMapping("/rooms/{roomId}/admins")
    public ResponseEntity<?> addUserAsAdmin(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestBody Map<String, Object> payload) {
        
        try {
            User user = getCurrentUser(request);
            Long targetUserId = Long.valueOf(String.valueOf(payload.get("userId")));
            
            boolean added = chatService.addUserAsAdmin(roomId, targetUserId, user.getId());
            
            if (added) {
                return ResponseEntity.ok().body(Map.of("message", "User added as admin successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to add admins to this chat room");
            }
        } catch (Exception e) {
            log.error("Error adding user as admin", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error adding user as admin: " + e.getMessage());
        }
    }
    
    /**
     * Remove a user's admin status from a chat room.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @param userId The ID of the user to remove admin status from
     * @return Success or failure response
     */
    @DeleteMapping("/rooms/{roomId}/admins/{userId}")
    public ResponseEntity<?> removeUserAsAdmin(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @PathVariable Long userId) {
        
        try {
            User user = getCurrentUser(request);
            boolean removed = chatService.removeUserAsAdmin(roomId, userId, user.getId());
            
            if (removed) {
                return ResponseEntity.ok().body(Map.of("message", "Admin status removed successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to remove admin status or the user is not an admin");
            }
        } catch (Exception e) {
            log.error("Error removing user as admin", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error removing user as admin: " + e.getMessage());
        }
    }
    
    /**
     * Update the minimum guild role required to be a chat admin.
     * 
     * @param request The HTTP request containing JWT token
     * @param roomId The ID of the chat room
     * @param payload The payload containing the minimum role
     * @return Success or failure response
     */
    @PutMapping("/rooms/{roomId}/guild-admin-role")
    public ResponseEntity<?> updateGuildChatAdminRole(
            HttpServletRequest request,
            @PathVariable Long roomId,
            @RequestBody Map<String, String> payload) {
        
        try {
            User user = getCurrentUser(request);
            // Check if the user is an admin of this chat room
            if (!chatService.isUserAdmin(roomId, user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to update admin roles for this chat room");
            }
            
            String roleStr = payload.get("minRole");
            GuildRole minRole = GuildRole.valueOf(roleStr);
            
            boolean updated = chatService.majGuildChatAdmins(roomId, minRole);
            
            if (updated) {
                return ResponseEntity.ok().body(Map.of("message", "Guild chat admin role updated successfully"));
            } else {
                return ResponseEntity.badRequest()
                        .body("Failed to update guild chat admin role. This might not be a guild chat room.");
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid guild role: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error updating guild chat admin role", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating guild chat admin role: " + e.getMessage());
        }
    }
    
    /**
     * Get specific chat room by type and group ID (like finding a guild's chat room).
     * 
     * @param request The HTTP request containing JWT token
     * @param type The type of chat room (GUILD, GLOBAL, FIGHT)
     * @param groupId The ID of the group (guild ID, fight ID)
     * @return The chat room if found and user has access
     */
    @GetMapping("/rooms/by-type")
    public ResponseEntity<?> getChatRoomByTypeAndGroupId(
            HttpServletRequest request,
            @RequestParam String type,
            @RequestParam Long groupId) {
        
        try {
            User user = getCurrentUser(request);
            ChatType chatType = ChatType.valueOf(type);
            ChatRoom chatRoom = chatRoomRepository.findByTypeAndGroupId(chatType, groupId);
            
            if (chatRoom == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Check if user has access to this room
            if (!chatRoom.getUserIds().contains(user.getId()) && !canUserAccessByType(user.getId(), chatType, groupId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have access to this chat room");
            }
            
            return ResponseEntity.ok(chatRoom);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid chat room type");
        } catch (Exception e) {
            log.error("Error retrieving chat room by type and group ID", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving chat room: " + e.getMessage());
        }
    }
    
    /**
     * Helper method to check if a user can access a chat room by type.
     */
    private boolean canUserAccessByType(Long userId, ChatType type, Long groupId) {
        if (type == ChatType.GLOBAL) {
            return true;
        } else if (type == ChatType.GUILD) {
            // This would need to check if the user is in the guild
            return guildService.isUserInGuild(userId, groupId);
        }
        return false;
    }
    
    /**
     * Create or get global chat room.
     * This endpoint handles both authenticated and anonymous users.
     */
    @GetMapping("/rooms/global")
    public ResponseEntity<?> getOrCreateGlobalChatRoom(HttpServletRequest request) {
        try {
            User user = null;
            try {
                user = getCurrentUser(request);
            } catch (Exception e) {
                // If we can't get a user, treat as anonymous
                log.info("Anonymous user accessing global chat room");
            }
            
            // For anonymous users, just return info about the global chat room
            if (user == null) {
                // Try to find existing global chat room
                List<ChatRoom> globalRooms = chatRoomRepository.findByType(ChatType.GLOBAL);
                
                if (globalRooms.isEmpty()) {
                    // Create a global chat room if it doesn't exist
                    log.info("No global chat room found, creating a new one");
                    ChatRoom globalRoom = chatService.createGlobalChatRoom("Global Chat");
                    return ResponseEntity.ok(globalRoom);
                } else {
                    // Return existing global room for anonymous user
                    log.info("Found existing global chat room for anonymous user");
                    return ResponseEntity.ok(globalRooms.get(0));
                }
            }
            
            // For authenticated users, connect them to the room
            log.info("Getting or creating global chat room for user {}", user.getId());
            
            // Try to find existing global chat room
            List<ChatRoom> globalRooms = chatRoomRepository.findByType(ChatType.GLOBAL);
            ChatRoom globalRoom;
            
            if (globalRooms.isEmpty()) {
                // Create if it doesn't exist
                log.info("No global chat room found, creating a new one");
                globalRoom = chatService.createGlobalChatRoom("Global Chat");
            } else {
                // Use the first one if it exists
                log.info("Found existing global chat room: {}", globalRooms.get(0).getId());
                globalRoom = globalRooms.get(0);
            }
            
            // Connect the user to the room if they're not already connected
            if (!globalRoom.getUserIds().contains(user.getId())) {
                log.info("Connecting user {} to global chat room", user.getId());
                chatService.connectUserToChatRoom(globalRoom.getId(), user.getId());
            } else {
                log.info("User {} is already connected to global chat room", user.getId());
            }
            
            return ResponseEntity.ok(globalRoom);
        } catch (Exception e) {
            log.error("Error getting or creating global chat room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error with global chat room: " + e.getMessage());
        }
    }
}
