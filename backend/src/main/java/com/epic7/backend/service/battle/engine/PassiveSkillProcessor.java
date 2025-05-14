package com.epic7.backend.service.battle.engine;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;

import com.epic7.backend.model.skill_kit.TriggerCondition;

import java.util.List;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PassiveSkillProcessor {

    private final PlayerHeroService playerHeroService;
    private final SkillService skillService;

    /**
     * Gère les passifs au début du tour.
     * Parcourt les héros du joueur et applique les effets passifs.
     * @param state
     * @param participant
     */
    @Transactional(readOnly = true)
    public void handleTurnStartPassives(BattleState state, BattleParticipant participant) {
        // Pas de filtrage pour le RTA, tous les héros peuvent avoir des passifs
        
        try {
            // Protection contre les nulls
            if (participant == null || participant.getId() == null) {
                state.getLogs().add("⚠️ Participant invalide pour l'activation des passifs");
                return;
            }
            
            // Tentative de récupérer le héros avec gestion des erreurs plus robuste
            PlayerHero ph = null;
            try {
                ph = playerHeroService.findById(participant.getId());
            } catch (Exception e) {
                // Log détaillé mais continuez sans bloquer le jeu
                state.getLogs().add("ℹ️ Passifs ignorés pour " + participant.getName() + " (ID:" + participant.getId() + ")");
                return;
            }
            
            if (ph == null) {
                // En RTA, c'est possible que certains héros n'aient pas de PlayerHero correspondant
                // On ne bloque pas le jeu, on ignore simplement
                return;
            }
            
            Hero hero = ph.getHero();
            if (hero == null) {
                return;
            }
            
            if (hero.getSkills() == null) {
                return;
            }

            // Récupérer les compétences sous forme de DTO pour éviter les problèmes de session Hibernate
            List<SkillDTO> skillDTOs = skillService.getSkillDTOsByHero(hero.getId());
            
            // Filtrer et appliquer les compétences passives en utilisant les DTOs
            skillDTOs.stream()
                    .filter(skillDTO -> skillDTO != null 
                            && "PASSIVE".equals(skillDTO.getCategory())
                            && "ON_TURN_START".equals(skillDTO.getTriggerCondition()))
                    .forEach(skillDTO -> {
                        try {
                            applyPassiveEffectFromDTO(skillDTO, participant, state);
                        } catch (Exception e) {
                            state.getLogs().add("⚠️ Erreur d'application du passif " + skillDTO.getName());
                        }
                    });
        } catch (Exception e) {
            String participantName = (participant != null && participant.getName() != null) ? participant.getName() : "inconnu";
            state.getLogs().add("❌ Erreur lors de l'activation du passif de " + participantName);
        }
    }

    /**
     * Applique l'effet passif au participant en utilisant un DTO.
     * Gestion robuste des cas où les objets pourraient être null.
     */
    private void applyPassiveEffectFromDTO(SkillDTO skillDTO, BattleParticipant participant, BattleState state) {
        // Vérification préalable pour éviter les NullPointerException
        if (skillDTO == null || participant == null || state == null) {
            return; // Silencieusement ignorer pour éviter d'autres erreurs
        }

        try {
            String heroName = (participant.getName() != null) ? participant.getName() : "Héros inconnu";
            String skillName = (skillDTO.getName() != null) ? skillDTO.getName() : "Compétence inconnue";
            
            if (skillDTO.getPassiveBonus() != null) {
                switch (skillDTO.getPassiveBonus()) {
                    case "ATTACK_UP" -> {
                        int bonus = (int) (participant.getAttack() * (skillDTO.getBonusValue() / 100.0));
                        participant.setAttack(participant.getAttack() + bonus);
                        state.getLogs().add("✨ " + heroName + " déclenche " + skillName
                                + " (passif) et gagne +" + bonus + " ATK.");
                    }
                    case "DEFENSE_UP" -> {
                        int bonus = (int) (participant.getDefense() * (skillDTO.getBonusValue() / 100.0));
                        participant.setDefense(participant.getDefense() + bonus);
                        state.getLogs().add("🛡️ " + heroName + " déclenche " + skillName
                                + " (passif) et gagne +" + bonus + " DEF.");
                    }
                    case "SPEED_UP" -> {
                        int bonus = (int) (participant.getSpeed() * (skillDTO.getBonusValue() / 100.0));
                        participant.setSpeed(participant.getSpeed() + bonus);
                        state.getLogs().add("💨 " + heroName + " déclenche " + skillName
                                + " (passif) et gagne +" + bonus + " Vitesse.");
                    }
                    default -> {
                        state.getLogs().add("⚠️ Passif non géré : " + skillDTO.getPassiveBonus());
                    }
                }
            } else if (skillDTO.getAction() != null) {
                // Passifs de type heal/damage
                switch (skillDTO.getAction()) {
                    case "HEAL" -> {
                        int healAmount = (int) (skillDTO.getScalingFactor() * participant.getMaxHp());
                        participant.setCurrentHp(Math.min(participant.getMaxHp(), participant.getCurrentHp() + healAmount));
                        state.getLogs().add("✨ " + heroName + " déclenche " + skillName
                                + " (passif) et se soigne de " + healAmount + " PV.");
                    }
                    case "DAMAGE" -> {
                        // À implémenter si besoin : dégâts automatiques à l'ennemi
                        state.getLogs().add("⚠️ Passif DAMAGE non implémenté pour l'instant.");
                    }
                    default -> {
                        state.getLogs().add("ℹ️ Passif " + skillName + " sans effet actif.");
                    }
                }
            }
        } catch (Exception e) {
            if (participant != null && participant.getName() != null) {
                state.getLogs().add("⚠️ Erreur inattendue pour le passif de " + participant.getName() + ": " + e.getMessage());
            } else {
                state.getLogs().add("⚠️ Erreur inattendue lors de l'application d'un passif");
            }
        }
    }
    
    /**
     * Ancienne version utilisant l'entité Skill directement - conservée pour compatibilité
     */
    private void applyPassiveEffect(Skill skill, BattleParticipant participant, BattleState state) {
        // Vérification préalable pour éviter les NullPointerException
        if (skill == null || participant == null || state == null) {
            return; // Silencieusement ignorer pour éviter d'autres erreurs
        }

        try {
            // Conversion en DTO pour éviter les problèmes de session Hibernate
            SkillDTO skillDTO = new SkillDTO();
            skillDTO.setId(skill.getId());
            skillDTO.setName(skill.getName());
            skillDTO.setDescription(skill.getDescription());
            skillDTO.setPassiveBonus(skill.getPassiveBonus() != null ? skill.getPassiveBonus().name() : null);
            skillDTO.setBonusValue(skill.getBonusValue());
            skillDTO.setAction(skill.getAction() != null ? skill.getAction().name() : null);
            skillDTO.setScalingFactor(skill.getScalingFactor());
            
            // Utiliser la méthode DTO-based
            applyPassiveEffectFromDTO(skillDTO, participant, state);
        } catch (Exception e) {
            state.getLogs().add("⚠️ Erreur lors de la conversion du passif: " + e.getMessage());
        }
    }
}
