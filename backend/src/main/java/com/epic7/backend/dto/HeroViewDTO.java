package com.epic7.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class HeroViewDTO {
    private Long id;
    private String name;
    private String element;
    private String rarity;
    private int baseAttack;
    private int baseDefense;
    private int baseSpeed;
    private int health;
    private String code;

    private List<SkillDTO> skills;
}
