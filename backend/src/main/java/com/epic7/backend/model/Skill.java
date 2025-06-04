package com.epic7.backend.model;

import com.epic7.backend.model.skill_kit.PassiveBonusType;
import com.epic7.backend.model.skill_kit.SkillAction;
import com.epic7.backend.model.skill_kit.SkillCategory;
import com.epic7.backend.model.skill_kit.StatScaling;
import com.epic7.backend.model.skill_kit.TargetGroup;
import com.epic7.backend.model.skill_kit.TriggerCondition;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
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
    @JoinColumn(name = "hero_id")
    @JsonIgnore // Prevent recursive serialization
    private Hero hero;

    /**
     * Vérifie si la compétence est active = TRUE | passive = FALSE.
     * @return
     */
    public boolean isActive() {
        return SkillCategory.ACTIVE.equals(this.category);
    }

    /**
     * Vérifie si la cible est valide pour cette compétence.
     * @param actor Le combattant qui utilise la compétence
     * @param target La cible potentielle
     * @return true si la cible est valide, false sinon
     */
    public boolean isTargetMatching(com.epic7.backend.service.battle.model.BattleParticipant actor, 
                                  com.epic7.backend.service.battle.model.BattleParticipant target) {
        // Si le groupe de cible est null, aucune cible n'est valide
        if (this.targetGroup == null) {
            return false;
        }
        
        // Analyse en fonction du groupe de cible
        switch (this.targetGroup) {
            case SELF:
                // La compétence ne peut cibler que soi-même
                return actor.equals(target);
            case SINGLE_ENEMY:
                // La compétence cible un ennemi unique (userId différent) - null-safe pour les boss
                return !areSameUser(actor, target) && target.getCurrentHp() > 0;
            case SINGLE_ALLY:
                // La compétence cible un allié unique (même userId) - null-safe pour les boss
                return !actor.equals(target) && areSameUser(actor, target) && target.getCurrentHp() > 0;
            case ALL_ALLIES:
                // Pour les compétences qui affectent tous les alliés, on vérifie juste si c'est un allié - null-safe
                return areSameUser(actor, target) && target.getCurrentHp() > 0;
            case ALL_ENEMIES:
                // Pour les compétences qui affectent tous les ennemis, on vérifie juste si c'est un ennemi - null-safe
                return !areSameUser(actor, target) && target.getCurrentHp() > 0;
            default:
                return false;
        }
    }
    
    /**
     * Vérifie si deux participants appartiennent au même utilisateur (null-safe).
     * Les boss ont userId null, donc ils ne sont jamais du même utilisateur que les joueurs.
     */
    private boolean areSameUser(com.epic7.backend.service.battle.model.BattleParticipant actor, 
                               com.epic7.backend.service.battle.model.BattleParticipant target) {
        String actorUserId = actor.getUserId();
        String targetUserId = target.getUserId();
        
        // Si l'un des userId est null (boss), ils ne sont pas du même utilisateur
        if (actorUserId == null || targetUserId == null) {
            return false;
        }
        
        // Comparaison normale si les deux ont des userId
        return actorUserId.equals(targetUserId);
    }

}
