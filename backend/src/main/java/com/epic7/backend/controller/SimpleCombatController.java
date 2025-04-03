package com.epic7.backend.controller;

import com.epic7.backend.dto.simple.*;
import com.epic7.backend.model.User;
import com.epic7.backend.service.battle.simple.SimpleBattleState;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.battle.simple.SimpleBattleService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur REST pour gérer les combats simples.
 * Le système de combat est tour par tour, déterministe, et basé sur la vitesse.
 */
@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class SimpleCombatController {

    private final SimpleBattleService battleService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    private SimpleBattleState currentBattleState;

    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Démarre un nouveau combat contre un boss donné.
     */
    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
                                                            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
        currentBattleState = battleService.initBattle(user, combatRequest.getBossHeroId());
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
     * Utilise une compétence active.
     */
    @PostMapping("/action/skill")
    public ResponseEntity<SkillActionResultDTO> useSkill(@RequestBody SimpleSkillActionRequest request) {
        SkillActionResultDTO result = battleService.useSkillWithResult(currentBattleState, request);
        //currentBattleState = battleService.convertFromDTO(result.getBattleState()); // si nécessaire
        return ResponseEntity.ok(result);
    }
    

    /**
     * Récupère l'état actuel du combat.
     */
    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }
}
