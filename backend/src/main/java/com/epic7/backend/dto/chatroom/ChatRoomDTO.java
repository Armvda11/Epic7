package com.epic7.backend.dto.chatroom;

import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for ChatRoom information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
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
        int count = (chatRoom.getUserIds() != null) ? chatRoom.getUserIds().size() : 0;
        dto.setMemberCount(count);
        
        return dto;
    }
    
    /**
     * Create a DTO from a ChatRoom entity with user context
     */
    public static ChatRoomDTO fromEntity(ChatRoom chatRoom, Long userId) {
        ChatRoomDTO dto = fromEntity(chatRoom);
        
        // Check if user is admin
        boolean isAdmin = chatRoom.getAdminUserIds() != null && 
                        chatRoom.getAdminUserIds().contains(userId);
        dto.setAdmin(isAdmin);
        
        return dto;
    }
}