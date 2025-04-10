package com.epic7.backend.controller;

import com.epic7.backend.dto.simple.*;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.battle.engine.BattleEngine;
import com.epic7.backend.service.battle.manager.BossBattleManager;
import com.epic7.backend.service.battle.state.BattleState;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class SimpleCombatController {

    private final BossBattleManager battleService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final BattleEngine battleEngine;

    // État de combat en mémoire pour ce joueur
    private BattleState currentBattleState;

    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Lance un nouveau combat contre un boss.
     */
    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
                                                            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
        currentBattleState = battleService.initBattle(user, combatRequest.getBossHeroId(), combatRequest.getSelectedPlayerHeroIds());

        currentBattleState.setRewardType(ShopItemType.DIAMOND);
        currentBattleState.setRewardAmount(1000);

        return ResponseEntity.ok(battleService.toDTO(currentBattleState));
    }

    /**
     * Utilise une compétence active sur une cible.
     */
    @PostMapping("/action/skill")
    public ResponseEntity<SkillActionResultDTO> useSkill(@RequestBody SimpleSkillActionRequest request) {
        SkillActionResultDTO result = battleService.useSkill(currentBattleState, request);
        return ResponseEntity.ok(result);
    }

    /**
     * Récupère l’état actuel du combat.
     */
    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        if (currentBattleState == null) return ResponseEntity.badRequest().build();
    
        // Le boss joue automatiquement s’il doit jouer
        currentBattleState = battleEngine.processUntilNextPlayer(currentBattleState);
    
        return ResponseEntity.ok(battleService.toDTO(currentBattleState));
    }
    

    /**
     * Attribue la récompense de victoire si le combat est terminé.
     */
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
