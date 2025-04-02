package com.epic7.backend.controller;

import com.epic7.backend.dto.simple.SimpleActionRequest;
import com.epic7.backend.dto.simple.SimpleBattleStateDTO;
import com.epic7.backend.dto.simple.StartCombatRequest;
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
 */
@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class SimpleCombatController {

    private final SimpleBattleService battleService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;

    // État unique conservé pour la session de combat
    private SimpleBattleState currentBattleState;

    /**
     * Extrait l'utilisateur authentifié à partir du JWT.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Lance un nouveau combat contre un boss spécifique.
     * @param request         Requête HTTP contenant le token JWT
     * @param combatRequest   Contient l'identifiant du boss
     * @return                L'état initial du combat
     */
    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
                                                            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
        System.out.println("[DEBUG] Combat lancé par " + user.getEmail());

        currentBattleState = battleService.startBattle(user, combatRequest.getBossHeroId());
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
     * Le joueur effectue une action contre un adversaire.
     * @param request Détails de l'action (cible)
     * @return        État mis à jour du combat
     */
    @PostMapping("/action")
    public ResponseEntity<SimpleBattleStateDTO> doAction(@RequestBody SimpleActionRequest request) {
        currentBattleState = battleService.doTurn(currentBattleState, request);
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }

    /**
     * Permet de récupérer l'état courant du combat.
     * @return DTO représentant l'état courant
     */
    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }
}
