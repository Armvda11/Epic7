package com.epic7.backend.dto;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class SkillDTO {
    private Long id;

    @NotBlank(message = "Le nom de la compétence ne peut pas être vide")
    private String name;

    private String description;

    @NotNull(message = "La catégorie de la compétence ne peut pas être nulle")
    private String category;

    @Min(0)
@Max(2)
private Integer position;



    private String action;
    private String targetGroup;

    @Positive(message = "Le nombre de cibles doit être positif")
    private Integer targetCount;

    private String scalingStat;

    @Positive(message = "Le facteur de mise à l'échelle doit être positif")
    private Double scalingFactor;

    @Min(value = 0, message = "Le cooldown doit être supérieur ou égal à 0")
    private Integer cooldown;

    private String passiveBonus;
    private Double bonusValue;
    private Boolean applyToAllies;
    private String triggerCondition;
}
