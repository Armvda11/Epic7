package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

import com.epic7.backend.model.GuildMembership;

/**
 * DTO contenant les informations d'un membre de guilde.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuildMemberDTO {
    private Long id;
    private Long userId;
    private String username;
    private String avatar;
    private int level;
    private String role;
    private Instant joinDate;
    private int contributions; // Nombre de points de contribution
    private Instant lastActivity; // Dernière activité dans la guilde

    /**
     * Constructeur à partir d'une entité GuildMembership
     */
    public static GuildMemberDTO fromEntity(GuildMembership membership) {
        GuildMemberDTO dto = new GuildMemberDTO();
        dto.setId(membership.getId());
        dto.setUserId(membership.getUser().getId());
        dto.setUsername(membership.getUser().getUsername());
        dto.setAvatar(null); // Avatar peut être ajouté plus tard
        dto.setLevel(membership.getUser().getLevel());
        dto.setRole(membership.getRole().name());
        dto.setJoinDate(membership.getJoinDate());
        
        return dto;
    }
}
