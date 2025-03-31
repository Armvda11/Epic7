package com.epic7.backend.model;

import com.epic7.backend.model.enums.PassiveBonusType;
import com.epic7.backend.model.enums.SkillAction;
import com.epic7.backend.model.enums.SkillCategory;
import com.epic7.backend.model.enums.StatScaling;
import com.epic7.backend.model.enums.TargetGroup;
import com.epic7.backend.model.enums.TriggerCondition;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Représente une compétence d'un héros.
 * Chaque compétence a un nom, une description,
 * une catégorie (ACTIVE ou PASSIVE), une action (DAMAGE ou HEAL),
 * un groupe cible (un ennemi, tous les alliés, etc.),
 * un nombre de cibles, une statistique de mise à l'échelle (ATK, HP),
 * un facteur de mise à l'échelle, un cooldown, 
 */
@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String name;

    private String description;

    // ACTIVE = compétence classique / PASSIVE = effet permanent (toujours la skill 2)
    @Enumerated(EnumType.STRING)
    private SkillCategory category;

    // Pour les compétences actives : dégâts ou soin
    @Enumerated(EnumType.STRING)
    private SkillAction action;

    // Cible(s) de la compétence (ex: un ennemi, tous les alliés…)
    @Enumerated(EnumType.STRING)
    private TargetGroup targetGroup;

    // Nombre de cibles (utile pour attaques multi)
    private Integer targetCount;

    // Stat utilisée pour calcul (ATK, HP)
    @Enumerated(EnumType.STRING)
    private StatScaling scalingStat;

    // Coefficient multiplicateur (ex : 1.3 = 130% ATK)
    private Double scalingFactor;

    // Cooldown entre deux utilisations (seulement pour actives)
    private Integer cooldown;

    // Type de bonus/malus pour les passives
    @Enumerated(EnumType.STRING)
    private PassiveBonusType passiveBonus;

    // Valeur du bonus/malus passif (ex: +25 vitesse)
    private Double bonusValue;

    //  null = le porteur, true = alliés, false = ennemis
    private Boolean applyToAllies;

    // Déclenchement automatique (ex: "quand un allié meurt")
    @Enumerated(EnumType.STRING)
    private TriggerCondition triggerCondition;

    // Association au héros possesseur de la compétence (un heros peut avoir plusieurs compétences 3 max)
    @ManyToOne
    private Hero hero;


}
