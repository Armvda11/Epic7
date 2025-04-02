package com.epic7.backend.service.battle;

import com.epic7.backend.model.Skill;
import com.epic7.backend.model.skill_kit.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Moteur de compétences. Applique les effets des compétences actives et passives.
 */
@Component
@RequiredArgsConstructor
public class SkillEngine {

    public void applySkill(BattleParticipant caster, Skill skill, List<BattleParticipant> targets) {
        if (skill.getCategory() != SkillCategory.ACTIVE) return;

        switch (skill.getAction()) {
            case DAMAGE -> applyDamage(caster, skill, targets);
            case HEAL -> applyHeal(caster, skill, targets);
            default -> {}
        }

        caster.getCooldowns().put(skill.getId(), skill.getCooldown());
    }

    public void applyPassive(BattleParticipant owner, Skill skill, BattleParticipant context) {
        if (skill.getCategory() != SkillCategory.PASSIVE || skill.getTriggerCondition() == null) return;

        double value = skill.getBonusValue() != null ? skill.getBonusValue() : 0;

        switch (skill.getPassiveBonus()) {
            case DEFENSE_UP -> applyStatBonus(owner, "DEF", value);
            case ATTACK_UP -> applyStatBonus(owner, "ATK", value);
            case SPEED_UP -> applyStatBonus(owner, "SPD", value);
            case HEAL_REDUCTION -> {
                // TODO: Appliquer un malus de soins reçu
            }
            case DEFENSE_DOWN -> {
                // TODO: Appliquer un malus de défense
            }
            default -> {}
        }
    }

    private void applyDamage(BattleParticipant caster, Skill skill, List<BattleParticipant> targets) {
        for (BattleParticipant target : targets) {
            int damage = computeDamage(caster, skill, target);
            target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));
        }
    }

    private void applyHeal(BattleParticipant caster, Skill skill, List<BattleParticipant> targets) {
        for (BattleParticipant target : targets) {
            int healing = computeHealing(caster, skill);
            int maxHp = target.getBaseHero().getHealth();
            target.setCurrentHp(Math.min(target.getCurrentHp() + healing, maxHp));
        }
    }

    private void applyStatBonus(BattleParticipant p, String statType, double percent) {
        switch (statType) {
            case "DEF" -> {
                int bonus = (int) (p.getTotalAttack() * (percent / 100.0));
                p.setTotalDefense(p.getTotalDefense() + bonus);
            }
            case "ATK" -> {
                int bonus = (int) (p.getTotalAttack() * (percent / 100.0));
                p.setTotalAttack(p.getTotalAttack() + bonus);
            }
            case "SPD" -> {
                int bonus = (int) (p.getTotalSpeed() * (percent / 100.0));
                p.setTotalSpeed(p.getTotalSpeed() + bonus);
            }
        }
    }

    private int computeDamage(BattleParticipant caster, Skill skill, BattleParticipant target) {
        double attackValue = switch (skill.getScalingStat()) {
            case ATTACK -> caster.getTotalAttack();
            case HEALTH -> caster.getCurrentHp();
            default -> 0;
        };

        double rawDamage = attackValue * skill.getScalingFactor();
        double defenseFactor = target.getTotalDefense() / (300.0 + target.getTotalDefense());
        double finalDamage = rawDamage * (1 - defenseFactor);

        return (int) finalDamage;
    }

    private int computeHealing(BattleParticipant caster, Skill skill) {
        double base = switch (skill.getScalingStat()) {
            case ATTACK -> caster.getTotalAttack();
            case HEALTH -> caster.getCurrentHp();
            default -> 0;
        };
        return (int) (base * skill.getScalingFactor());
    }
}
