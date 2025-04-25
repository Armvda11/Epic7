package com.epic7.backend.dto.rta;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillActionMessage {
    // qu’on aura reçu après avoir obtenu le battleId
    private String battleId;
    private Long skillId;
    private Long targetId;
}