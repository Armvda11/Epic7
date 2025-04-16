package com.epic7.backend.dto.simple;

import lombok.Data;

@Data
public class SkillUseMessage {
    private Long skillId;
    private Long targetId;
}
