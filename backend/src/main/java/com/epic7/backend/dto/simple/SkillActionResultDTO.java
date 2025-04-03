package com.epic7.backend.dto.simple;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SkillActionResultDTO {
    private SimpleBattleStateDTO battleState;
    private int damageDealt;
    private Long targetId;
    private String type; // "DAMAGE" ou "HEAL"
}
