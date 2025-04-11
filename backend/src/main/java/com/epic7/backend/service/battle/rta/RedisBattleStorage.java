// package com.epic7.backend.service.battle.rta;
// import org.springframework.boot.autoconfigure.cache.CacheProperties.Redis;

// import com.epic7.backend.service.battle.state.BattleState;

// public class RedisBattleStorage {

//     private final RedisTemplate<String, Object> redisTemplate;
    

//     public void saveBattle(String battleId, BattleState battleResult) {
//         redisTemplate.opsForValue().set(battleId, battleResult);
//     }

//     public BattleState getBattle(String battleId) {
//         return (BattleState) redisTemplate.opsForValue().get(battleId);
//     }
//     public void deleteBattle(String battleId) {
//         redisTemplate.delete(battleId);
//     }

    
// }
