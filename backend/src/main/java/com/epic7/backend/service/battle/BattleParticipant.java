package com.epic7.backend.service.battle;

import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.Skill;
import lombok.Data;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Représente un participant au combat, qu'il soit joueur ou boss.
 * Contient les statistiques calculées, la jauge d'action et les compétences.
 */
@Data
public class BattleParticipant {
    private Long playerHeroId; // null si boss
    private String side; // "PLAYER" ou "ENEMY"
    private Hero baseHero;
    private int currentHp;
    private int totalAttack;
    private int totalDefense;
    private int totalSpeed;
    private double actionGauge = 0.0;

    private List<Skill> skills;
    private Map<Long, Integer> cooldowns = new HashMap<>();

    public String getName() {
        return baseHero.getName();
    }

    public boolean isAlive() {
        return currentHp > 0;
    }

    public boolean isReady() {
        return actionGauge >= 1000.0;
    }

    public void resetActionGauge() {
        this.actionGauge = 0.0;
    }

    public void reduceCooldowns() {
        cooldowns.replaceAll((id, cd) -> Math.max(0, cd - 1));
    }
}