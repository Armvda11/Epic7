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
 * Contrôleur pour gérer les combats simples.
 * Il permet de démarrer un combat, d'utiliser une compétence active,
 * de récupérer l'état actuel du combat et de gérer les actions automatiques.
 * 
 * @author Hermas
 */
@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class SimpleCombatController {

    private final SimpleBattleService battleService;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private SimpleBattleState currentBattleState;

    /**
     * Récupère l'utilisateur actuel à partir du token JWT dans l'en-tête de la
     * requête.
     * 
     * @param request La requête HTTP contenant le token JWT.
     * @return L'utilisateur correspondant au token JWT.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Démarre un combat avec un boss spécifique.
     * 
     * @param request       La requête HTTP contenant le token JWT.
     * @param combatRequest La requête contenant l'identifiant du boss.
     * @return L'état actuel du combat.
     */
    @PostMapping("/start")
    public ResponseEntity<SimpleBattleStateDTO> startCombat(HttpServletRequest request,
            @RequestBody StartCombatRequest combatRequest) {
        User user = getCurrentUser(request);
    
        currentBattleState = battleService.initBattle(
                user,
                combatRequest.getBossHeroId(),
                combatRequest.getSelectedPlayerHeroIds()
        );
        System.out.println("🛡️ Démarrage du combat avec : " + combatRequest.getSelectedPlayerHeroIds());

    
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }
    

    /**
     * Effectuer un skill choisi par le joueur.
     * 
     * @param request La requête contenant l'identifiant du héros joueur,
     *                l'identifiant de la compétence et l'identifiant de la cible.
     * @return Le résultat de l'action de compétence, y compris l'état de la
     *         bataille, les dégâts infligés et l'identifiant de la cible.
     */
    @PostMapping("/action/skill")
    public ResponseEntity<SkillActionResultDTO> useSkill(@RequestBody SimpleSkillActionRequest request) {
        SkillActionResultDTO result = battleService.useSkillWithResult(currentBattleState, request);
        // currentBattleState = battleService.convertFromDTO(result.getBattleState());
        // // si nécessaire
        return ResponseEntity.ok(result);
    }

    /**
     * Récupère l'état actuel du combat.
     * 
     * @return
     */
    @GetMapping("/state")
    public ResponseEntity<SimpleBattleStateDTO> getCombatState() {
        if (currentBattleState == null) {
            return ResponseEntity.badRequest().build(); // ou 204 No Content
        }
        return ResponseEntity.ok(battleService.convertToDTO(currentBattleState));
    }
    
}
