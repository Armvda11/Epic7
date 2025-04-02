package com.epic7.backend.dto.battleDTO;

import com.epic7.backend.dto.SkillDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BattleStateDTO {
    private int turnNumber;
    private List<BattleParticipantDTO> participants;
    private List<CombatLogDTO> logs;
}

