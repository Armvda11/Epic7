package com.epic7.backend.service.battle.engine;

import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.skill_kit.TargetGroup;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import com.epic7.backend.dto.simple.SkillActionResultDTO;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SkillEngine {

    private final PlayerHeroService playerHeroService;
    private final SkillService skillService;
    private final BattleEngine battleEngine;

    /**
     * Exécute une compétence active en appliquant ses effets.
     */
    public SkillActionResultDTO useSkillWithResult(BattleState state, Long skillId, Long targetId) {
        if (state == null || state.isFinished()) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        BattleParticipant actor = state.getParticipants().get(state.getCurrentTurnIndex());
        Skill skill = skillService.getSkillById(skillId);

        // Vérifie que le skill appartient bien au héros joueur
        if (actor.isPlayer()) {
            try {
                PlayerHero ph = playerHeroService.findById(actor.getId());
                Hero hero = ph.getHero();
                boolean belongs = hero.getSkills().stream().anyMatch(s -> s.getId().equals(skill.getId()));

                if (!belongs) {
                    state.getLogs().add("❌ Cette compétence n'appartient pas au héros sélectionné.");
                    return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
                }
            } catch (Exception e) {
                state.getLogs().add("❌ Erreur lors de la vérification du héros joueur.");
                return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
            }
        }

        // Check validité
        if (!skill.isActive()) {
            state.getLogs().add("❌ Cette compétence n'est pas active.");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        if (actor.getCurrentHp() <= 0) {
            battleEngine.nextTurn(state);
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        if (state.isSkillOnCooldown(actor.getId(), skill.getId())) {
            state.getLogs().add("⏳ Compétence en recharge !");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        BattleParticipant target = state.getParticipants().stream()
                .filter(p -> p.getId().equals(targetId))
                .findFirst()
                .orElse(null);

        if (target == null) {
            state.getLogs().add("❌ Cible non trouvée.");
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), 0, null, "NONE");
        }

        // Appliquer l’effet
        int amount = switch (skill.getAction()) {
            case DAMAGE -> applyDamage(actor, target, skill, state);
            case HEAL -> applyHeal(actor, target, skill, state);
            default -> 0;
        };

        // Gérer cooldown
        if (skill.getCooldown() > 0) {
            state.putCooldown(actor.getId(), skill.getId(), skill.getCooldown());
        }

        // Vérifie fin du combat
        if (battleEngine.checkEnd(state)) {
            return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(), skill.getAction().name());
        }

        // Passe au suivant
        battleEngine.nextTurn(state);
        return new SkillActionResultDTO(new SimpleBattleStateDTO(state), amount, target.getId(), skill.getAction().name());
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
            actor.setCurrentHp(Math.min(actor.getMaxHp(), actor.getCurrentHp() + heal));
            state.getLogs().add(actor.getName() + " utilise " + skill.getName() + " et se soigne de " + heal + " PV.");
        }

        return heal;
    }
}
