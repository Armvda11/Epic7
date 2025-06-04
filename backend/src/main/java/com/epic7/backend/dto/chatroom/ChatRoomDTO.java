package com.epic7.backend.dto.chatroom;

import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * DTO for ChatRoom information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class ChatRoomDTO {
    private Long id;
    private String name;
    private ChatType type;
    private Long groupId;
    private int memberCount;
    private boolean isAdmin; // Whether the current user is an admin of this room
    
    /**
     * Create a DTO from a ChatRoom entity
     */
    public static ChatRoomDTO fromEntity(ChatRoom chatRoom) {
        ChatRoomDTO dto = new ChatRoomDTO();
        dto.setId(chatRoom.getId());
        dto.setName(chatRoom.getName());
        dto.setType(chatRoom.getType());
        dto.setGroupId(chatRoom.getGroupId());
        
        // Count members - for global rooms this is a placeholder
        int count = 0;
        try {
            if (chatRoom.getUserIds() != null) {
                count = chatRoom.getUserIds().size();
            }
        } catch (org.hibernate.LazyInitializationException e) {
            // If the collection is not initialized and session is closed, default to 0
            log.warn("Failed to access userIds for chat room {}: {}", chatRoom.getId(), e.getMessage());
        }
        dto.setMemberCount(count);
        
        return dto;
    }
    
    /**
     * Create a DTO from a ChatRoom entity with user context
     */
    public static ChatRoomDTO fromEntity(ChatRoom chatRoom, Long userId) {
        ChatRoomDTO dto = fromEntity(chatRoom);
        
        // Check if user is admin
        boolean isAdmin = false;
        try {
            if (chatRoom.getAdminUserIds() != null) {
                isAdmin = chatRoom.getAdminUserIds().contains(userId);
            }
        } catch (org.hibernate.LazyInitializationException e) {
            log.warn("Failed to access adminUserIds for chat room {}: {}", chatRoom.getId(), e.getMessage());
        }
        dto.setAdmin(isAdmin);
        
        return dto;
    }
}