package com.epic7.backend.service;

import com.epic7.backend.event.ChatMessageEvent;
import com.epic7.backend.model.Guild;
import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;
import com.epic7.backend.repository.ChatMessageRepository;
import com.epic7.backend.repository.ChatRoomRepository;
import com.epic7.backend.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

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
    private ChatRoom createGlobalChatRoom(String name) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.GLOBAL);
        chatRoom.setUserIds(new ArrayList<>());

        // Set admin user IDs to a default admin user (ID 1), first user in the database
        User admin = userRepository.findById(1L)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
        chatRoom.setAdminUserIds(Collections.singletonList(admin.getId()));
        chatRoom.setGroupId(null);
        // Save the chat room to the database
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Create a guild chat room
     */
    @Transactional
    private ChatRoom createGuildChatRoom(String name, Long guildId, Long ownerId) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.GUILD);
        chatRoom.setGroupId(guildId);
        chatRoom.setUserIds(new ArrayList<>());

        // Set admin user IDs to the guild owner
        chatRoom.setAdminUserIds(Collections.singletonList(ownerId));
        
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Create a fight chat room
     */
    @Transactional
    private ChatRoom createFightChatRoom(String name, Long fightId, List<Long> userIds) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.FIGHT);
        chatRoom.setGroupId(fightId);
        chatRoom.setUserIds(new ArrayList<>(userIds));
        chatRoom.setAdminUserIds(null); // No admins for fight chat rooms
        // Save the chat room to the database
        return chatRoomRepository.save(chatRoom);
    }

    
    /**
     * Get chat messages for a specific room
     */
    private List<ChatMessage> getChatRoomMessages(Long roomId, int limit) {
        // Verify chat room exists
        ChatRoom chatRoom = getChatRoomById(roomId);
        if (chatRoom == null) {
            throw new IllegalArgumentException("Chat room not found");
        }
        
        // Use existing method for pagination
        Pageable pageable = PageRequest.of(0, limit);
        return chatMessageRepository.findLastMessagesByChatRoomId(roomId, pageable);
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
        
        return getChatRoomMessages(roomId, limit);
    }

    private ChatMessage sendMessage(Long chatRoomId, ChatMessage message) {

        // Publish event to notify listeners (like WebSocket handler)
        eventPublisher.publishEvent(new ChatMessageEvent(chatRoomId, message));
        
        // Save the message to the database
        return chatMessageRepository.save(message);
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

        return sendMessage(roomId, message);
    }

    private boolean deleteMessage(ChatMessage message) {
        // Publish event to notify listeners (like WebSocket handler)
        // eventPublisher.publishEvent(new ChatMessageDeletionEvent(message.getChatRoom().getId(), message));
        
        // Delete the message from the database
        chatMessageRepository.delete(message);
        return true;
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
        boolean isAdmin = isUserChatRoomAdmin(message.getChatRoom().getId(), userId);
        boolean isSender = message.getSender().getId().equals(userId);
        
        if (isAdmin || isSender) {
            // Delete the message
            return deleteMessage(message);
        } else {
            return false;
        }
    }

    /**
     * Check if a user is an admin of a chat room
     */
    public boolean isUserChatRoomAdmin(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        return chatRoom.getAdminUserIds() != null && chatRoom.getAdminUserIds().contains(userId);
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
        
        // Check if it's defined
        if (chatRoom.getUserIds() == null) {
            chatRoom.setUserIds(new ArrayList<>());
        }

        // Check if user is already connected
        if (!chatRoom.getUserIds().contains(userId)) {
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
            // In this case the group ID is the guild ID
            return guildService.isUserInGuild(userId, chatRoom.getGroupId());
        }
        
        // Fight chat rooms require being in the userIds list
        if (chatRoom.getType() == ChatType.FIGHT) {
            return chatRoom.getUserIds() != null && chatRoom.getUserIds().contains(userId);
        }
        
        return false;
    }

    /**
     * Get a chat message by its ID
     * @param messageId The ID of the message to retrieve
     * @return The ChatMessage if found, null otherwise
     */
    public ChatMessage getChatMessageById(Long messageId) {
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
                        throw new IllegalArgumentException("Guild not found");
                    }
                    Guild guild = guildOptional.get();
                    return createGuildChatRoom(guild.getName() + " Chat", groupId, guild.getLeader());
                } catch (Exception e) {
                    log.error("Error fetching guild info for chat room creation: {} - {}", e.getClass().getName(), e.getMessage());
                    // On error, fallback to creating a generic guild chat room
                    throw new IllegalArgumentException("Error fetching guild info for chat room creation");
                }
            } else if (type == ChatType.FIGHT) {
                // For fight chat rooms, we need more info like the list of users
                throw new IllegalArgumentException("Fight chat rooms must be created through the battle service");
            } else {
                throw new IllegalArgumentException("Unsupported chat room type: " + type);
            }
        }
    }

    public ChatRoom getOrCreateFightChatRoom(Long fightId, List<Long> userIds) {
        // Check if a fight chat room already exists for this fight ID
        List<ChatRoom> existingRooms = chatRoomRepository.findByTypeAndGroupId(ChatType.FIGHT, fightId);
        
        if (!existingRooms.isEmpty()) {
            return existingRooms.get(0);
        } else {
            // Create a new fight chat room
            return createFightChatRoom("Fight " + fightId.toString(), fightId, userIds);
        }
    }

    public boolean isUserAdminOfChatRoom(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
        
        return chatRoom.getAdminUserIds() != null && chatRoom.getAdminUserIds().contains(userId);
    }

    public boolean isMessageFromUser(Long messageId, Long userId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        
        return message.getSender().getId().equals(userId);
    }
}