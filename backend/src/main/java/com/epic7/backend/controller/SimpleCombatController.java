package com.epic7.backend.controller;

import com.epic7.backend.dto.simple.*;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.battle.simple.SimpleBattleService;
import com.epic7.backend.service.battle.simple.SimpleBattleState;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class SimpleCombatController {

    private final SimpleBattleService battleService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    // Stockage en mémoire uniquement pour ce joueur
    private SimpleBattleState currentBattleState;

    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
                                                            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
        currentBattleState = battleService.initBattle(user, combatRequest.getBossHeroId(), combatRequest.getSelectedPlayerHeroIds());

        // Ajout de la récompense simple ici (exemple : 1000 diamants)
        currentBattleState.setRewardType(ShopItemType.DIAMOND);
        currentBattleState.setRewardAmount(1000);
        

        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    @PostMapping("/action/skill")
    public ResponseEntity<SkillActionResultDTO> useSkill(@RequestBody SimpleSkillActionRequest request) {
        SkillActionResultDTO result = battleService.useSkillWithResult(currentBattleState, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        if (currentBattleState == null) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }
    @PostMapping("/reward")
public ResponseEntity<RewardDTO> giveVictoryReward(HttpServletRequest request) {
    if (currentBattleState == null || !currentBattleState.isFinished()) {
        return ResponseEntity.badRequest().build();
    }

    User user = getCurrentUser(request);
    RewardDTO reward = battleService.giveVictoryReward(user, currentBattleState);
    return ResponseEntity.ok(reward);
}

    
}
