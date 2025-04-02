package com.epic7.backend.dto.battleDTO;

import lombok.Data;

import java.util.List;
import java.util.Map;

import com.epic7.backend.dto.SkillDTO;

@Data
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
