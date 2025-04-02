package com.epic7.backend.controller;

import com.epic7.backend.dto.battleDTO.BattleStateDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.service.battle.BattleParticipant;
import com.epic7.backend.service.battle.BattleService;
import com.epic7.backend.service.battle.BattleState;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class CombatController {

    private final BattleService battleService;
    private final PlayerHeroRepository playerHeroRepo;
    private final HeroRepository heroRepo;

    private BattleState currentState;

    /**
     * Démarre un nouveau combat avec l'équipe du joueur et un boss.
     */
    @PostMapping("/start")
    public ResponseEntity<BattleStateDTO> startCombat(@RequestBody List<Long> playerHeroIds,
                                                      @RequestParam Long bossHeroId) {
        List<PlayerHero> team = playerHeroRepo.findAllById(playerHeroIds);
        Hero boss = heroRepo.findById(bossHeroId).orElseThrow(() -> new IllegalArgumentException("Boss introuvable"));

        currentState = battleService.startBattle(team, boss);
        return ResponseEntity.ok(battleService.toDTO(currentState));
    }

    /**
     * Exécute un tour spécifié (acteur, compétence, cibles).
     */
    @PostMapping("/turn")
    public ResponseEntity<BattleStateDTO> performTurn(@RequestParam int actorIndex,
                                                      @RequestParam Long skillId,
                                                      @RequestBody List<Integer> targetIndexes) {
        validateCombatState();

        BattleParticipant actor = currentState.getParticipants().get(actorIndex);
        var skill = actor.getSkills().stream()
                .filter(s -> s.getId().equals(skillId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Compétence introuvable pour cet acteur"));

        List<BattleParticipant> targets = targetIndexes.stream()
                .map(i -> currentState.getParticipants().get(i))
                .toList();

        battleService.performTurn(currentState, actor, skill, targets);
        return ResponseEntity.ok(battleService.toDTO(currentState));
    }

    /**
     * Joue automatiquement un tour IA si c'est à son tour.
     */
    @PostMapping("/ai-turn")
    public ResponseEntity<BattleStateDTO> performAITurn() {
        validateCombatState();
        battleService.performAITurn(currentState);
        return ResponseEntity.ok(battleService.toDTO(currentState));
    }

    /**
     * Simule un tour automatiquement jusqu'à un héros prêt (joueur ou IA).
     */
    @PostMapping("/auto-turn")
    public ResponseEntity<BattleStateDTO> automaticTurn() {
        validateCombatState();
        currentState = battleService.processNextReadyTurn(currentState);
        return ResponseEntity.ok(battleService.toDTO(currentState));
    }

    /**
     * Affiche l'état courant du combat.
     */
    @GetMapping("/status")
    public ResponseEntity<BattleStateDTO> getCombatStatus() {
        validateCombatState();
        return ResponseEntity.ok(battleService.toDTO(currentState));
    }

    /**
     * Réinitialise le combat en mémoire.
     */
    @PostMapping("/reset")
    public ResponseEntity<String> resetCombat() {
        currentState = null;
        return ResponseEntity.ok("Combat réinitialisé.");
    }

    /**
     * Vérifie que le combat est bien initialisé.
     */
    private void validateCombatState() {
        if (currentState == null) {
            throw new IllegalStateException("Aucun combat en cours");
        }
    }
}
