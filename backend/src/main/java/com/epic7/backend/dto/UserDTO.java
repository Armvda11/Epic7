package com.epic7.backend.dto;

import com.epic7.backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Simplified User DTO for chat and messaging features.
 * Contains only the basic information needed for messages.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private int level;
    private String guildName;
    
    /**
     * Creates a UserDTO from a User entity, including only essential information
     */
    public static UserDTO fromEntity(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setLevel(user.getLevel());
        
        // Include guild name if user is in a guild
        if (user.getGuildMembership() != null && 
            user.getGuildMembership().getGuild() != null) {
            dto.setGuildName(user.getGuildMembership().getGuild().getName());
        } else {
            dto.setGuildName("None");
        }
        
        return dto;
    }
}