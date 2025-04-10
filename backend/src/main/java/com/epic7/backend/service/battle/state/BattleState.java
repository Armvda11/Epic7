package com.epic7.backend.service.battle.state;

import lombok.Data;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.service.battle.model.BattleParticipant;

@Data
public class BattleState {

    private List<BattleParticipant> participants;
    private int currentTurnIndex;
    private boolean finished;
    private List<String> logs;
    
    private int roundCount = 1;
    private ShopItemType rewardType;
    private int rewardAmount;

    /**
     * Cooldowns par héros : Map<PlayerHeroId, Map<SkillId, cooldownRestant>>
     */
    private Map<Long, Map<Long, Integer>> cooldowns = new HashMap<>();

    public int getRemainingCooldown(Long playerHeroId, Long skillId) {
        return cooldowns.getOrDefault(playerHeroId, new HashMap<>()).getOrDefault(skillId, 0);
    }

    public void putCooldown(Long playerHeroId, Long skillId, int cooldown) {
        cooldowns.computeIfAbsent(playerHeroId, k -> new HashMap<>()).put(skillId, cooldown);
    }

    public void reduceCooldownsForHero(Long playerHeroId) {
        cooldowns.computeIfPresent(playerHeroId, (phId, skillMap) -> {
            skillMap.replaceAll((skillId, value) -> Math.max(0, value - 1));
            return skillMap;
        });
    }

    public boolean isSkillOnCooldown(Long playerHeroId, Long skillId) {
        return getRemainingCooldown(playerHeroId, skillId) > 0;
    }

    public void reduceAllCooldownsExcept(Long currentHeroId) {
        cooldowns.forEach((heroId, skills) -> {
            if (!heroId.equals(currentHeroId)) {
                skills.replaceAll((skillId, turns) -> Math.max(0, turns - 1));
            }
        });
    }
} 
