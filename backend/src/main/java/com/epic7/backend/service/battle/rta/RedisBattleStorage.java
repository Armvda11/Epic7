package com.epic7.backend.service.battle.rta;

import com.epic7.backend.service.battle.state.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisBattleStorage {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String PREFIX = "battle:";

    public void saveBattle(String battleId, BattleState battleState) {
        redisTemplate.opsForValue().set(PREFIX + battleId, battleState);
    }

    public BattleState getBattle(String battleId) {
        Object result = redisTemplate.opsForValue().get(PREFIX + battleId);
        if (result instanceof BattleState state) {
            return state;
        }
        return null;
    }

    public void deleteBattle(String battleId) {
        redisTemplate.delete(PREFIX + battleId);
    }
}
