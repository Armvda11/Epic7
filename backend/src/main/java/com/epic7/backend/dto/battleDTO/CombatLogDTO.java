package com.epic7.backend.dto.battleDTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CombatLogDTO {
    private String actorName;
    private String actionName;
    private String targetName;
    private int damage; // ou heal
    private boolean isHeal;
}
