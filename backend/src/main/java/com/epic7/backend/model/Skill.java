package com.epic7.backend.model;

import java.util.Optional;

import com.epic7.backend.model.skill_kit.PassiveBonusType;
import com.epic7.backend.model.skill_kit.SkillAction;
import com.epic7.backend.model.skill_kit.SkillCategory;
import com.epic7.backend.model.skill_kit.StatScaling;
import com.epic7.backend.model.skill_kit.TargetGroup;
import com.epic7.backend.model.skill_kit.TriggerCondition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
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

    @Column(unique = true,nullable = false)
    @NotBlank(message = "Le nom de la compétence ne peut pas être vide")
    private String name;

    private String description;


    @Min(value = 0, message = "La position doit être supérieure ou égale à 0")
    @Max(value = 2, message = "La position doit être inférieure ou égale à 2")
    private Integer position; // 0 = 1ere compétence, 1 = 2e compétence, 2 = 3e compétence

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
    @Positive(message = "Le nombre de cibles doit être positif")
    private int targetCount;

    // Stat utilisée pour calcul (ATK, HP)
    @Enumerated(EnumType.STRING)
    private StatScaling scalingStat;

    // Coefficient multiplicateur (ex : 1.3 = 130% ATK)
    @Positive(message = "Le facteur de mise à l'échelle doit être positif")
    private Double scalingFactor  ;

    // Cooldown entre deux utilisations (seulement pour actives)
    @Min(value = 0, message = "Le cooldown doit être supérieur ou égal à 0")
    private Integer cooldown ;

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

    /**
     * Vérifie si la compétence est active = TRUE | passive = FALSE.
     * @return
     */
    public boolean isActive() {
        return SkillCategory.ACTIVE.equals(this.category);
    }

}
