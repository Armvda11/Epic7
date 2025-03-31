package com.epic7.backend.dto;

import lombok.Data;

@Data
public class SkillDTO {
    private Long id;
    private String name;
    private String description;
    private String category;
    private String action;
    private String targetGroup;
    private Integer targetCount;
    private String scalingStat;
    private Double scalingFactor;
    private Integer cooldown;
    private String passiveBonus;
    private Double bonusValue;
    private Boolean applyToAllies;
    private String triggerCondition;
}
