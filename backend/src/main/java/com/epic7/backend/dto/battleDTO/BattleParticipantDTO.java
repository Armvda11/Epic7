package com.epic7.backend.dto.battleDTO;

import com.epic7.backend.dto.SkillDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;


/**
 * Décrit un participant (joueur ou boss) pour affichage ou suivi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BattleParticipantDTO {
    private String name;
    private String side;
    private int currentHp;
    private int totalAttack;
    private int totalDefense;
    private int totalSpeed;
    private double actionGauge;
    private Map<Long, Integer> cooldowns;
    private List<SkillDTO> skills;
}