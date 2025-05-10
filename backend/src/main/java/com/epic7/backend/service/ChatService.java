package com.epic7.backend.service;

import com.epic7.backend.dto.chatroom.ChatMessageDTO;
import com.epic7.backend.event.ChatMessageEvent;
import com.epic7.backend.model.Guild;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;
import com.epic7.backend.repository.ChatMessageRepository;
import com.epic7.backend.repository.ChatRoomRepository;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Service for chat functionality.
 * Handles chat rooms, messages, and access control.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final GuildService guildService;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Get a chat room by ID
     */
    public ChatRoom getChatRoomById(Long roomId) {
        return chatRoomRepository.findById(roomId).orElse(null);
    }

    /**
     * Create a global chat room with the given name
     */
    @Transactional
    public ChatRoom createGlobalChatRoom(String name) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.GLOBAL);
        chatRoom.setUserIds(new ArrayList<>());
        chatRoom.setAdminUserIds(new ArrayList<>());
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Create a guild chat room
     */
    @Transactional
    public ChatRoom createGuildChatRoom(String name, Long guildId) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.GUILD);
        chatRoom.setGroupId(guildId);
        chatRoom.setUserIds(new ArrayList<>());
        chatRoom.setAdminUserIds(new ArrayList<>());
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Create a fight chat room
     */
    @Transactional
    public ChatRoom createFightChatRoom(String name, Long fightId, List<Long> userIds, List<Long> adminUserIds) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.FIGHT);
        chatRoom.setGroupId(fightId);
        chatRoom.setUserIds(new ArrayList<>(userIds));
        chatRoom.setAdminUserIds(new ArrayList<>(adminUserIds));
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Get all chat rooms a user is a member of
     */
    public List<ChatRoom> getUserChatRooms(Long userId) {
        // Get rooms where user is explicitly in userIds
        List<ChatRoom> userRooms = chatRoomRepository.findByUserIdsContaining(userId);
        
        // Get global rooms (available to all)
        List<ChatRoom> globalRooms = chatRoomRepository.findByType(ChatType.GLOBAL);
        
        // Get guild room if user is member of a guild
        List<ChatRoom> guildRooms = new ArrayList<>();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Check if user has a guild
        if (user.getGuildMembership() != null) {
            Long guildId = user.getGuildMembership().getGuild().getId();
            List<ChatRoom> userGuildRooms = chatRoomRepository.findByTypeAndGroupId(ChatType.GUILD, guildId);
            if (userGuildRooms != null && !userGuildRooms.isEmpty()) {
                guildRooms.addAll(userGuildRooms);
            }
        }
        
        // Combine all lists
        List<ChatRoom> allRooms = new ArrayList<>();
        allRooms.addAll(userRooms);
        allRooms.addAll(globalRooms);
        allRooms.addAll(guildRooms);
        
        // Remove duplicates (if any)
        return allRooms.stream().distinct().toList();
    }

    /**
     * Get recent messages for a chat room
     */
    public List<ChatMessage> getRecentMessages(Long roomId, Long userId, int limit) {
        // Verify chat room exists
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        // Check if user has access to this chat room
        if (!canUserAccessChat(userId, chatRoom)) {
            throw new IllegalStateException("User does not have access to this chat room");
        }
        
        // Get recent messages using Pageable for pagination
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        return chatMessageRepository.findByChatRoomIdOrderByTimestampDesc(roomId, pageable);
    }

    /**
     * Send a message to a chat room
     */
    @Transactional
    public ChatMessage sendMessage(User sender, Long roomId, String content) {
        // Verify chat room exists
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        // Check if user has access to this chat room
        if (!canUserAccessChat(sender.getId(), chatRoom)) {
            throw new IllegalStateException("User does not have access to this chat room");
        }
        
        // Create and save message
        ChatMessage message = new ChatMessage();
        message.setChatRoom(chatRoom);
        message.setSender(sender);
        message.setContent(content);
        message.setTimestamp(Instant.now());
        
        // Save to database
        ChatMessage savedMessage = chatMessageRepository.save(message);
        
        // Publish event to notify listeners (like WebSocket handler)
        eventPublisher.publishEvent(new ChatMessageEvent(roomId, savedMessage));
        
        return savedMessage;
    }

    /**
     * Delete a message
     */
    @Transactional
    public boolean deleteMessage(Long messageId, Long userId) {
        // Find message
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        
        // Check if user is sender or admin
        boolean isAdmin = isUserAdmin(message.getChatRoom().getId(), userId);
        boolean isSender = message.getSender().getId().equals(userId);
        
        if (isAdmin || isSender) {
            chatMessageRepository.delete(message);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Check if a user is an admin of a chat room
     */
    public boolean isUserAdmin(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        return chatRoom.getAdminUserIds() != null && chatRoom.getAdminUserIds().contains(userId);
    }

    /**
     * Check if a user is an admin of a chat room - method to match controller endpoint naming
     */
    public boolean isUserChatRoomAdmin(Long roomId, Long userId) {
        return isUserAdmin(roomId, userId);
    }

    /**
     * Check if a user is an admin of a chat room
     * Legacy method name for backward compatibility
     */
    public boolean isUserChatAdmin(Long userId, Long roomId) {
        return isUserAdmin(roomId, userId);
    }

    /**
     * Delete a message by ID
     * Simplified method that doesn't require userId parameter
     */
    public boolean deleteMessage(Long messageId) {
        try {
            // Find message
            ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
            
            // Delete the message
            chatMessageRepository.delete(message);
            return true;
        } catch (Exception e) {
            log.error("Error deleting message", e);
            return false;
        }
    }

    /**
     * Connect a user to a chat room
     */
    @Transactional
    public boolean connectUserToChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        // Check if user can access this chat room
        if (!canUserAccessChat(userId, chatRoom)) {
            return false;
        }
        
        // Add user to the room if not already there and not a global room
        if (chatRoom.getType() != ChatType.GLOBAL && 
            (chatRoom.getUserIds() == null || !chatRoom.getUserIds().contains(userId))) {
            
            if (chatRoom.getUserIds() == null) {
                chatRoom.setUserIds(new ArrayList<>());
            }
            
            chatRoom.getUserIds().add(userId);
            chatRoomRepository.save(chatRoom);
        }
        
        return true;
    }

    /**
     * Check if a user can access a chat room
     */
    public boolean canUserAccessChat(Long userId, ChatRoom chatRoom) {
        if (chatRoom == null) {
            return false;
        }
        
        // Global chat rooms are accessible to all
        if (chatRoom.getType() == ChatType.GLOBAL) {
            return true;
        }
        
        // Guild chat rooms require guild membership
        if (chatRoom.getType() == ChatType.GUILD) {
            if (chatRoom.getGroupId() == null) {
                return false;
            }
            
            return guildService.isUserInGuild(userId, chatRoom.getGroupId());
        }
        
        // Fight chat rooms require being in the userIds list
        if (chatRoom.getType() == ChatType.FIGHT) {
            return chatRoom.getUserIds() != null && chatRoom.getUserIds().contains(userId);
        }
        
        return false;
    }

    /**
     * Process a batch of chat messages
     * 
     * @param sender The user sending the messages
     * @param messageDTOs The messages to process
     * @return List of processed messages
     */
    @Transactional
    public List<ChatMessage> processBatchMessages(User sender, List<ChatMessageDTO> messageDTOs) {
        if (messageDTOs == null || messageDTOs.isEmpty()) {
            return Collections.emptyList();
        }
        
        List<ChatMessage> processedMessages = new ArrayList<>();
        
        for (ChatMessageDTO messageDTO : messageDTOs) {
            if (messageDTO.getRoomId() == null || messageDTO.getContent() == null) {
                throw new IllegalArgumentException("Room ID and content are required for each message");
            }
            
            // Process each message individually
            ChatMessage message = sendMessage(sender, messageDTO.getRoomId(), messageDTO.getContent());
            processedMessages.add(message);
        }
        
        return processedMessages;
    }
    
    /**
     * Mark messages as read up to a specific message ID
     * 
     * @param roomId The chat room ID
     * @param userId The user ID
     * @param lastReadMessageId The last message ID that was read
     * @return Number of messages marked as read
     */
    @Transactional
    public int markMessagesAsRead(Long roomId, Long userId, Long lastReadMessageId) {
        // Verify chat room exists
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        // Check if user has access to this chat room
        if (!canUserAccessChat(userId, chatRoom)) {
            throw new IllegalStateException("User does not have access to this chat room");
        }
        
        // Find all unread messages in the room up to the lastReadMessageId
        List<ChatMessage> messages = chatMessageRepository.findByChatRoomId(roomId);
        int updatedCount = 0;
        
        // In a real implementation, you would have a more efficient query
        // This is a simplistic approach
        for (ChatMessage message : messages) {
            if (message.getId() <= lastReadMessageId) {
                // Mark as read in your user-message read status tracking
                // This would depend on how you track read status
                updatedCount++;
            }
        }
        
        return updatedCount;
    }

    /**
     * Find chat rooms by type
     *
     * @param type The chat room type
     * @return A list of chat rooms of the specified type
     */
    public List<ChatRoom> findChatRoomsByType(ChatType type) {
        return chatRoomRepository.findByType(type);
    }

    /**
     * Get a chat message by its ID
     * @param messageId The ID of the message to retrieve
     * @return The ChatMessage if found, null otherwise
     */
    public ChatMessage getMessageById(Long messageId) {
        if (messageId == null) {
            return null;
        }
        return chatMessageRepository.findById(messageId).orElse(null);
    }

    /**
     * Get or create the global chat room
     */
    @Transactional
    public ChatRoom getOrCreateGlobalChatRoom() {
        // First check if a global chat room already exists
        List<ChatRoom> globalRooms = chatRoomRepository.findByType(ChatType.GLOBAL);
        
        if (!globalRooms.isEmpty()) {
            // Return the first global chat room found
            return globalRooms.get(0);
        } else {
            // Create a new global chat room
            log.info("Creating new global chat room");
            return createGlobalChatRoom("Global Chat");
        }
    }

    /**
     * Get or create a chat room by type and group ID
     */
    @Transactional
    public ChatRoom getOrCreateChatRoomByTypeAndGroupId(ChatType type, Long groupId) {
        if (type == ChatType.GLOBAL) {
            return getOrCreateGlobalChatRoom();
        }
        
        // Try to find an existing chat room of this type for this group
        List<ChatRoom> rooms = chatRoomRepository.findByTypeAndGroupId(type, groupId);
        
        if (!rooms.isEmpty()) {
            return rooms.get(0);
        } else {
            // Create a new chat room based on type
            if (type == ChatType.GUILD) {
                // Get guild name for the chat room
                try {
                    Optional<Guild> guildOptional = guildService.getGuildById(groupId);
                    if (guildOptional.isEmpty()) {
                        log.warn("Guild with ID {} not found, creating generic guild chat room", groupId);
                        // If guild not found, create a generic guild chat room with a more generic name
                        return createGuildChatRoom("Guild " + groupId, groupId);
                    }
                    Guild guild = guildOptional.get();
                    return createGuildChatRoom(guild.getName() + " Chat", groupId);
                } catch (Exception e) {
                    log.error("Error fetching guild info for chat room creation: {} - {}", e.getClass().getName(), e.getMessage());
                    // On error, fallback to creating a generic guild chat room
                    return createGuildChatRoom("Guild " + groupId, groupId);
                }
            } else if (type == ChatType.FIGHT) {
                // For fight chat rooms, we need more info like the list of users
                // This would typically be handled in a separate method called from a battle service
                throw new IllegalArgumentException("Fight chat rooms must be created through the battle service");
            } else {
                throw new IllegalArgumentException("Unsupported chat room type: " + type);
            }
        }
    }

    /**
     * Get chat messages for a specific room
     */
    public List<ChatMessage> getChatRoomMessages(Long roomId, int limit) {
        // Verify chat room exists
        ChatRoom chatRoom = getChatRoomById(roomId);
        if (chatRoom == null) {
            throw new IllegalArgumentException("Chat room not found");
        }
        
        // Use existing method for pagination
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        return chatMessageRepository.findByChatRoomIdOrderByTimestampDesc(roomId, pageable);
    }

    /**
     * Get all chat rooms accessible to a user
     */
    public List<ChatRoom> getAllChatRoomsForUser(Long userId) {
        // This is equivalent to getUserChatRooms but with a name that
        // better matches the controller endpoint naming
        return getUserChatRooms(userId);
    }

    /**
     * Get a chat message by its ID
     */
    public ChatMessage getChatMessageById(Long messageId) {
        // This is equivalent to getMessageById but with a name that
        // better matches the controller endpoint naming
        return getMessageById(messageId);
    }
}
