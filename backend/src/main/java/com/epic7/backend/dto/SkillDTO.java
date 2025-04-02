package com.epic7.backend.dto;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Représente les données d’une compétence utilisée par un héros ou un boss.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillDTO {
    private Long id;

    @NotBlank(message = "Le nom de la compétence ne peut pas être vide")
    private String name;

    private String description;

    @NotNull(message = "La catégorie de la compétence ne peut pas être nulle")
    private String category; // Exemple : ACTIVE, PASSIVE

    @Min(0)
    @Max(2)
    private Integer position; // Position dans l'ordre d'affichage (skill1, skill2, etc.)

    private String action; // DAMAGE, HEAL, etc.
    private String targetGroup; // SINGLE_ENEMY, ALL_ALLIES, etc.

    @Positive(message = "Le nombre de cibles doit être positif")
    private Integer targetCount;

    private String scalingStat; // ATTACK ou HEALTH

    @Positive(message = "Le facteur de mise à l'échelle doit être positif")
    private Double scalingFactor;

    @Min(value = 0, message = "Le cooldown doit être supérieur ou égal à 0")
    private Integer cooldown;

    private String passiveBonus; // ATTACK_UP, DEFENSE_UP, etc.
    private Double bonusValue; // Valeur du bonus (ex: 20 pour 20%)

    private Boolean applyToAllies; // Pour les bonus de type buff/débuff
    private String triggerCondition; // ON_BATTLE_START, ON_TURN_START, etc.
}