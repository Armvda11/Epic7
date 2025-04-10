package com.epic7.backend.service.battle.engine;

import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import com.epic7.backend.model.skill_kit.TriggerCondition;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.battle.model.BattleParticipant;
import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PassiveSkillProcessor {

    private final PlayerHeroService playerHeroService;

    /**
     * Gère les passifs au début du tour.
     * Parcourt les héros du joueur et applique les effets passifs.
     * @param state
     * @param participant
     */
    public void handleTurnStartPassives(BattleState state, BattleParticipant participant) {
        if (!participant.isPlayer()) return; // Ne pas appliquer les passifs du boss Pour l'instant

        try {
            PlayerHero ph = playerHeroService.findById(participant.getId());
            Hero hero = ph.getHero();

            hero.getSkills().stream()
                    .filter(skill -> !skill.isActive() &&
                            skill.getTriggerCondition() == TriggerCondition.ON_TURN_START)
                    .forEach(skill -> applyPassiveEffect(skill, participant, state));
        } catch (Exception e) {
            state.getLogs().add("❌ Erreur lors de l’activation du passif de " + participant.getName());
        }
    }

    /**
     * Applique l’effet passif au participant.
     */
    private void applyPassiveEffect(Skill skill, BattleParticipant participant, BattleState state) {
        if (skill.getPassiveBonus() != null) {
            switch (skill.getPassiveBonus()) {
                case ATTACK_UP -> {
                    int bonus = (int) (participant.getAttack() * (skill.getBonusValue() / 100.0));
                    participant.setAttack(participant.getAttack() + bonus);
                    state.getLogs().add("✨ " + participant.getName() + " déclenche " + skill.getName()
                            + " (passif) et gagne +" + bonus + " ATK.");
                }
                case DEFENSE_UP -> {
                    int bonus = (int) (participant.getDefense() * (skill.getBonusValue() / 100.0));
                    participant.setDefense(participant.getDefense() + bonus);
                    state.getLogs().add("🛡️ " + participant.getName() + " déclenche " + skill.getName()
                            + " (passif) et gagne +" + bonus + " DEF.");
                }
                case SPEED_UP -> {
                    int bonus = (int) (participant.getSpeed() * (skill.getBonusValue() / 100.0));
                    participant.setSpeed(participant.getSpeed() + bonus);
                    state.getLogs().add("💨 " + participant.getName() + " déclenche " + skill.getName()
                            + " (passif) et gagne +" + bonus + " Vitesse.");
                }
                default -> {
                    state.getLogs().add("⚠️ Passif non géré : " + skill.getPassiveBonus());
                }
            }
        } else {
            // Passifs de type heal/damage
            switch (skill.getAction()) {
                case HEAL -> {
                    int healAmount = (int) (skill.getScalingFactor() * participant.getMaxHp());
                    participant.setCurrentHp(Math.min(participant.getMaxHp(), participant.getCurrentHp() + healAmount));
                    state.getLogs().add("✨ " + participant.getName() + " déclenche " + skill.getName()
                            + " (passif) et se soigne de " + healAmount + " PV.");
                }
                case DAMAGE -> {
                    // À implémenter si besoin : dégâts automatiques à l’ennemi
                    state.getLogs().add("⚠️ Passif DAMAGE non implémenté pour l’instant.");
                }
                default -> {
                    state.getLogs().add("❌ Passif mal configuré : aucun effet connu.");
                }
            }
        }
    }
}
