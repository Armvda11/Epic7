package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillActionMessage {
    private String battleId;  // Identifiant de la bataille
    private Long skillId;     // ID de la compétence utilisée
    private Long targetId;    // ID de la cible (participant)
}