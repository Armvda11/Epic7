package com.epic7.backend.dto;

import com.epic7.backend.model.Guild;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.GuildRank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO contenant les informations détaillées d'une guilde.
 * Utilisé quand l'utilisateur appartient à la guilde.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuildDTO {
    private Long id;
    private String name;
    private String description;
    private int level;
    private int gold;
    private int guildPoints;
    private GuildRank rank;
    private int ranking;
    private int memberCount;
    private int maxMembers;
    private boolean isOpen;
    private String userRole; // Role de l'utilisateur actuel dans la guilde

    /**
     * Constructeur à partir d'une entité Guild
     */
    public static GuildDTO fromEntity(Guild guild, boolean isPrivate) {
        GuildDTO dto = new GuildDTO();

        dto.setId(guild.getId());
        dto.setName(guild.getName());
        dto.setDescription(guild.getDescription());
        dto.setLevel(guild.getLevel());
        dto.setRank(guild.getRank());
        dto.setRanking(guild.getRanking());
        dto.setMemberCount(guild.getMembers().size());
        dto.setMaxMembers(guild.getMaxMembers());
        dto.setGuildPoints(guild.getGuildPoints());
        dto.setOpen(guild.isOpen());

        if (isPrivate) {
            dto.setGold(guild.getGold());
        } else {
            dto.setGold(0);
        }

        return dto;
    }

    /**
     * Constructeur à partir d'une entité Guild avec l'utilisateur pour déterminer son rôle
     */
    public static GuildDTO fromEntity(Guild guild, User user) {
        GuildDTO dto = fromEntity(guild, true);
        
        if (user != null && user.getGuildMembership() != null && 
            user.getGuildMembership().getGuild().getId().equals(guild.getId())) {
            dto.setUserRole(user.getGuildMembership().getRole().name());
        } else {
            dto.setUserRole(null);
        }
        
        return dto;
    }
}
