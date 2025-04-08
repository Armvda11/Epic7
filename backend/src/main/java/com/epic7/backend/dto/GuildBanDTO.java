package com.epic7.backend.dto;

import com.epic7.backend.model.GuildBan;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO contenant les informations d'un bannissement de guilde.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GuildBanDTO {
    private Long banId;
    private Long userId;
    private Long guildId;
    private Long bannedByUserId;
    private String userName;
    private String guildName;
    private String bannedByUserName;
    private Instant banDate;
    private Instant unbanDate;
    private String reason;

    /**
     * Constructeur à partir d'une entité GuildBan
     */
    public static GuildBanDTO fromEntity(GuildBan ban) {
        GuildBanDTO dto = new GuildBanDTO();
        dto.setBanId(ban.getId());
        dto.setUserId(ban.getUser().getId());
        dto.setUserId(ban.getUser().getId());
        dto.setGuildId(ban.getGuild().getId());
        dto.setBannedByUserId(ban.getBannedBy() != null ? ban.getBannedBy().getId() : null);

        dto.setUserName(ban.getUser().getUsername());
        dto.setGuildName(ban.getGuild().getName());
        dto.setBannedByUserName(ban.getBannedBy() != null ? ban.getBannedBy().getUsername() : null);
        
        dto.setBanDate(ban.getBanDate());
        dto.setUnbanDate(ban.getUnbanDate());
        dto.setReason(ban.getReason());
        return dto;
    }
}
