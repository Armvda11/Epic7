package com.epic7.backend.controller;

import com.epic7.backend.dto.simple.*;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.battle.simple.SimpleBattleService;
import com.epic7.backend.service.battle.simple.SimpleBattleState;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur REST pour gérer les combats simples.
 * Le système de combat est tour par tour, déterministe, et basé sur la vitesse.
 */@RestController
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

    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
                                                            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
        currentBattleState = battleService.startBattle(user, combatRequest.getBossHeroId());
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
     * Action basique (attaque normale).
     */
    @PostMapping("/action/basic")
    public ResponseEntity<SimpleBattleStateDTO> basicAttack(@RequestBody SimpleActionRequest request) {
        currentBattleState = battleService.doTurn(currentBattleState, request);
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
     * Utilisation d'une compétence active.
     */
    @PostMapping("/action/skill")
    public ResponseEntity<SimpleBattleStateDTO> useSkill(@RequestBody SimpleSkillActionRequest request) {
        currentBattleState = battleService.useSkill(currentBattleState, request);
        currentBattleState = battleService.processUntilNextPlayer(currentBattleState);
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
 * Le héros joueur joue automatiquement en suivant la priorité de ses compétences actives.
 * @param request Requête contenant l'ID du héros joueur
 */
@PostMapping("/auto-action")
public ResponseEntity<SimpleBattleStateDTO> autoPlayerAction(@RequestBody AutoActionRequest request) {
    currentBattleState = battleService.autoPlayerTurn(currentBattleState, request.getPlayerHeroId());
    return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
}

/**
 * Lance un combat automatique (tour complet jusqu’à la fin).
 */
@PostMapping("/auto")
public ResponseEntity<SimpleBattleStateDTO> autoBattle(HttpServletRequest request,
                                                       @RequestBody StartCombatRequest combatRequest) {
    User user = getCurrentUser(request);
    currentBattleState = battleService.startBattle(user, combatRequest.getBossHeroId());
    currentBattleState = battleService.runFullAutoBattle(currentBattleState, user);
    return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
}


}
