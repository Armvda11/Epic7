package com.epic7.backend.dto.battleDTO;

import lombok.Data;

import java.util.List;

@Data
public class BattleStateDTO {
    private int turnNumber; // Numéro du tour en cours
    private List<BattleParticipantDTO> participants; 
    private List<CombatLogDTO> logs; // Liste des logs de combat
}
