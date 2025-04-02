package com.epic7.backend.dto.battleDTO;

import lombok.*;

/**
 * Représente un événement de combat (dégât ou soin).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CombatLogDTO {
    private String actorName;
    private String actionName;
    private String targetName;
    private int damage; // Valeur des dégâts ou soins
    private boolean isHeal; // true si soin, false si dégâts
}
