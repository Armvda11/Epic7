package com.epic7.backend.dto;

import com.epic7.backend.model.Guild;
import com.epic7.backend.model.enums.GuildRank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO contenant les informations de base d'une guilde.
 * Utilisé pour les résultats de recherche quand l'utilisateur ne fait pas partie de la guilde.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuildInfoDTO {
    private Long id;
    private String name;
    private String description;
    private int level;
    private GuildRank rank;
    private int memberCount;
    private int maxMembers;
    private boolean isOpen; // Added this field

    /**
     * Constructeur à partir d'une entité Guild
     */
    public static GuildInfoDTO fromEntity(Guild guild) {
        GuildInfoDTO dto = new GuildInfoDTO();
        dto.setId(guild.getId());
        dto.setName(guild.getName());
        dto.setDescription(guild.getDescription());
        dto.setLevel(guild.getLevel());
        dto.setRank(guild.getRank());
        dto.setMemberCount(guild.getMembers().size());
        dto.setMaxMembers(20 + (guild.getLevel() * 5)); // Exemple: 20 membres de base + 5 par niveau
        dto.setOpen(guild.isOpen()); // Set the isOpen status
        return dto;
    }
}
