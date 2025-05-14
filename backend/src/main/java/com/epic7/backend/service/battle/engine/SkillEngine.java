package com.epic7.backend.service.battle.engine;

import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.dto.boss.SimpleBattleStateDTO;
import com.epic7.backend.dto.boss.SkillActionResultDTO;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.skill_kit.TargetGroup;
import java.util.List;
import com.epic7.backend.service.SkillService;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SkillEngine {

    private final SkillService skillService;
    private final BattleEngine battleEngine;

    /**
     * Exécute une compétence active en appliquant ses effets.
     * Annotation Transactional pour garder la session Hibernate ouverte 
     * pendant toute la durée de l'exécution.
     */
    @Transactional(readOnly = true)
    public SkillActionResultDTO useSkillWithResult(BattleState state, Long skillId, Long targetId) {
        if (state == null || state.isFinished()) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        BattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());
        
        // Récupérer la compétence avec DTO si possible, sinon l'entité directement
        SkillDTO skillDTO = null;
        Skill skill = null;
        boolean usingDTO = false;
        
        try {
            // Essayer d'abord le DTO
            List<SkillDTO> heroSkills = skillService.getSkillDTOsForPlayerHeroByPlayerHeroId(actor.getId());
            skillDTO = heroSkills.stream()
                    .filter(s -> s.getId().equals(skillId))
                    .findFirst()
                    .orElse(null);
            
            if (skillDTO != null) {
                usingDTO = true;
            } else {
                // Si pas de DTO, récupérer l'entité (fallback)
                skill = skillService.getSkillById(skillId);
            }
        } catch (Exception e) {
            // Fallback si une erreur de session se produit
            try {
                skill = skillService.getSkillById(skillId);
            } catch (Exception ex) {
                state.getLogs().add("❌ Erreur critique lors de la récupération de la compétence: " + ex.getMessage());
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
        }

        // Vérifie que le skill appartient bien au héros joueur
        // Pour le RTA, nous autorisons l'utilisation même si la vérification échoue
        try {
            List<SkillDTO> heroSkills = skillService.getSkillDTOsForPlayerHeroByPlayerHeroId(actor.getId());
            
            if (heroSkills != null && !heroSkills.isEmpty()) {
                boolean belongs = heroSkills.stream()
                    .anyMatch(s -> s != null && s.getId() != null && s.getId().equals(skillId));

                if (!belongs) {
                    state.getLogs().add("⚠️ Compétence non vérifiée mais autorisée pour le RTA");
                }
            }
        } catch (Exception e) {
            state.getLogs().add("⚠️ Vérification d'appartenance de compétence ignorée: " + e.getMessage());
        }
        
        // Vérifier si la compétence est active
        boolean isActive = usingDTO ? 
                "ACTIVE".equals(skillDTO.getCategory()) : 
                skill != null && skill.isActive();
                
        if (!isActive) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        if (actor.getCurrentHp() <= 0) {
            battleEngine.nextTurn(state);
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        // Vérifier cooldown selon qu'on utilise le DTO ou l'entité
        Long skillIdToCheck = usingDTO ? skillDTO.getId() : skill.getId();
        if (state.isSkillOnCooldown(actor.getId(), skillIdToCheck)) {
            state.getLogs().add("⏳ Compétence en recharge !");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        // Recherche de la cible avec plus de robustesse et d'information
        BattleParticipant target = null;
        for (BattleParticipant p : state.getParticipants()) {
            if (p != null && p.getId() != null && p.getId().equals(targetId)) {
                target = p;
                break;
            }
        }

        if (target == null) {
            // Log plus détaillé pour faciliter le débogage
            state.getLogs().add("❌ Cible non trouvée pour ID: " + targetId);
            
            // Lister tous les participants disponibles pour le débogage
            logParticipantsDebug(state);
            
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        // Variables pour la suite
        int amount;
        String actionType;
        
        // Appliquer l'effet selon qu'on utilise le DTO ou l'entité
        if (usingDTO) {
            // Utiliser le DTO
            // Vérifier d'abord si la cible est valide
            boolean targetIsValid = isTargetValid(skillDTO.getTargetGroup(), actor, target);
            
            if (!targetIsValid) {
                state.getLogs().add("❌ Cible invalide pour cette compétence: " + skillDTO.getTargetGroup());
                logParticipantsDebug(state);
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
            
            // Log de l'action
            state.getLogs().add(actor.getName() + " utilise " + skillDTO.getName() + " sur " + target.getName());
            
            // Appliquer l'effet
            if ("DAMAGE".equals(skillDTO.getAction())) {
                amount = applyDamageFromDTO(actor, target, skillDTO, state);
                actionType = "DAMAGE";
            } else if ("HEAL".equals(skillDTO.getAction())) {
                amount = applyHealFromDTO(actor, target, skillDTO, state);
                actionType = "HEAL";
            } else {
                amount = 0;
                actionType = "NONE";
            }
            
            // Gérer cooldown
            int cooldown = skillDTO.getCooldown() != null ? skillDTO.getCooldown() : 0;
            if (cooldown > 0) {
                state.putCooldown(actor.getId(), skillDTO.getId(), cooldown);
            }
        } else {
            // Utiliser l'entité
            if (skill.isTargetMatching(actor, target)) {
                // Log de l'action
                state.getLogs().add(actor.getName() + " utilise " + skill.getName() + " sur " + target.getName());
            } else {
                state.getLogs().add("❌ Cible invalide pour cette compétence: " + skill.getTargetGroup());
                logParticipantsDebug(state);
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
            
            // Appliquer l'effet
            amount = switch (skill.getAction()) {
                case DAMAGE -> applyDamage(actor, target, skill, state);
                case HEAL -> applyHeal(actor, target, skill, state);
                default -> 0;
            };
            actionType = skill.getAction().name();
            
            // Gérer cooldown
            if (skill.getCooldown() > 0) {
                state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
            }
        }

        // Vérifie fin du combat
        if (battleEngine.checkEnd(state)) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(), actionType);
        }

        // Passe au suivant
        battleEngine.nextTurn(state);
        return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(), actionType);
    }

    private int applyDamage(BattleParticipant actor, BattleParticipant target, Skill skill, BattleState state) {
        int dmg = Math.max(1, (int) (skill.getScalingFactor() * actor.getAttack() - target.getDefense()));
        target.setCurrentHp(Math.max(0, target.getCurrentHp() - dmg));
        state.getLogs().add(actor.getName() + " utilise " + skill.getName() + " sur " + target.getName() + " et inflige " + dmg + " dégâts.");
        return dmg;
    }

    private int applyHeal(BattleParticipant actor, BattleParticipant target, Skill skill, BattleState state) {
        int heal = (int) (skill.getScalingFactor() * actor.getMaxHp());

        if (skill.getTargetGroup() == TargetGroup.ALL_ALLIES) {
            state.getParticipants().stream()
                    .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                    .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + heal)));
            state.getLogs().add(actor.getName() + " utilise " + skill.getName() + " et soigne tous les alliés de " + heal + " PV.");
        } else {
            target.setCurrentHp(Math.min(target.getMaxHp(), target.getCurrentHp() + heal));
            state.getLogs().add(actor.getName() + " utilise " + skill.getName() + " et soigne " + target.getName() + " de " + heal + " PV.");
        }

        return heal;
    }

    /**
     * Vérifie si la cible est valide pour le groupe de cible donné (version DTO).
     */
    private boolean isTargetValid(String targetGroup, BattleParticipant actor, BattleParticipant target) {
        if (targetGroup == null) {
            return false;
        }
        
        // Logique simplifiée pour vérifier la validité de la cible
        switch (targetGroup) {
            case "SELF" -> {
                return actor.equals(target);
            }
            case "SINGLE_ENEMY" -> {
                return !actor.getUserId().equals(target.getUserId()) && target.getCurrentHp() > 0;
            }
            case "SINGLE_ALLY" -> {
                return actor.getUserId().equals(target.getUserId()) && target.getCurrentHp() > 0;
            }
            case "ALL_ALLIES" -> {
                return actor.getUserId().equals(target.getUserId()) && target.getCurrentHp() > 0;
            }
            default -> {
                return false;
            }
        }
    }
    
    /**
     * Affiche les participants disponibles pour faciliter le débogage.
     */
    private void logParticipantsDebug(BattleState state) {
        StringBuilder participantInfo = new StringBuilder("Participants disponibles: ");
        for (BattleParticipant p : state.getParticipants()) {
            if (p != null && p.getId() != null) {
                participantInfo.append(p.getName()).append("(ID:").append(p.getId()).append(") ");
            }
        }
        state.getLogs().add(participantInfo.toString());
    }
    
    /**
     * Applique les dégâts basé sur un DTO de compétence.
     */
    private int applyDamageFromDTO(BattleParticipant actor, BattleParticipant target, SkillDTO skillDTO, BattleState state) {
        int dmg = Math.max(1, (int) (skillDTO.getScalingFactor() * actor.getAttack() - target.getDefense()));
        target.setCurrentHp(Math.max(0, target.getCurrentHp() - dmg));
        state.getLogs().add(actor.getName() + " utilise " + skillDTO.getName() + " sur " + target.getName() + " et inflige " + dmg + " dégâts.");
        return dmg;
    }
    
    /**
     * Applique les soins basé sur un DTO de compétence.
     */
    private int applyHealFromDTO(BattleParticipant actor, BattleParticipant target, SkillDTO skillDTO, BattleState state) {
        int heal = (int) (skillDTO.getScalingFactor() * actor.getMaxHp());

        if ("ALL_ALLIES".equals(skillDTO.getTargetGroup())) {
            state.getParticipants().stream()
                    .filter(p -> p.isPlayer() && p.getCurrentHp() > 0)
                    .forEach(p -> p.setCurrentHp(Math.min(p.getMaxHp(), p.getCurrentHp() + heal)));
            state.getLogs().add(actor.getName() + " utilise " + skillDTO.getName() + " et soigne tous les alliés de " + heal + " PV.");
        } else {
            target.setCurrentHp(Math.min(target.getMaxHp(), target.getCurrentHp() + heal));
            state.getLogs().add(actor.getName() + " utilise " + skillDTO.getName() + " et soigne " + target.getName() + " de " + heal + " PV.");
        }

        return heal;
    }
}
