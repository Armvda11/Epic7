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

    /**
     * Applique une compétence ACTIVE sur les cibles.
     */
    public void applySkill(BattleParticipant caster, Skill skill, List<BattleParticipant> targets) {
        if (skill.getCategory() != SkillCategory.ACTIVE) return;

        if (skill.getAction() == SkillAction.DAMAGE) {
            for (BattleParticipant target : targets) {
                int damage = computeDamage(caster, skill, target);
                target.setCurrentHp(Math.max(0, target.getCurrentHp() - damage));
            }
        } else if (skill.getAction() == SkillAction.HEAL) {
            for (BattleParticipant target : targets) {
                int healing = computeHealing(caster, skill);
                int maxHp = target.getBaseHero().getHealth(); // tu pourrais aussi ajouter des bonus plus tard
                target.setCurrentHp(Math.min(target.getCurrentHp() + healing, maxHp));
            }
        }

        // Mise en cooldown de la compétence
        caster.getCooldowns().put(skill.getId(), skill.getCooldown());
    }

    /**
     * Applique une compétence PASSIVE en fonction de son trigger.
     */
    public void applyPassive(BattleParticipant owner, Skill skill, BattleParticipant context) {
        if (skill.getCategory() != SkillCategory.PASSIVE || skill.getTriggerCondition() == null) return;

        double value = skill.getBonusValue() != null ? skill.getBonusValue() : 0;

        switch (skill.getPassiveBonus()) {
            case DEFENSE_UP -> {
                // Divine Vessel : DEF ↑ proportionnelle à ATK totale
                int bonus = (int) (owner.getTotalAttack() * (value / 100.0));
                owner.setTotalDefense(owner.getTotalDefense() + bonus);
            }
            case ATTACK_UP -> {
                // Time to Rampage : ATK ↑ de X%
                int bonus = (int) (owner.getTotalAttack() * (value / 100.0));
                owner.setTotalAttack(owner.getTotalAttack() + bonus);
            }
            case SPEED_UP -> {
                int bonus = (int) (owner.getTotalSpeed() * (value / 100.0));
                owner.setTotalSpeed(owner.getTotalSpeed() + bonus);
            }
            case HEAL_REDUCTION -> {
                // Réduction de soin : réduit le soin reçu de X%
                // TODO : à implémenter
            }
            case DEFENSE_DOWN -> {
                // Réduction de défense : réduit la défense de X%
                //int malus  = (int) ()
            }

            // Autres effets possibles
            default -> {} // à compléter plus tard
        }
    }

    /**
     * Calcule les dégâts avec réduction par la défense.
     */
    private int computeDamage(BattleParticipant caster, Skill skill, BattleParticipant target) {
        double attackValue = switch (skill.getScalingStat()) {
            case ATTACK -> caster.getTotalAttack();
            case HEALTH -> caster.getCurrentHp(); // peut arriver pour certains heals
            default -> 0;
        };

        double rawDamage = attackValue * skill.getScalingFactor();

        // Réduction par la défense du target
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
