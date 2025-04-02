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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/combat")
@RequiredArgsConstructor
public class CombatController {

    private final BattleService battleService;
    private final PlayerHeroRepository playerHeroRepo;
    private final HeroRepository heroRepo;

    // ⚔️ État actuel du combat (en mémoire)
    private BattleState currentState;

    /**
     * 🚀 Démarre un nouveau combat avec une équipe de PlayerHero et un boss.
     */
    @PostMapping("/start")
    public BattleStateDTO startCombat(@RequestBody List<Long> playerHeroIds,
                                      @RequestParam Long bossHeroId) {
        List<PlayerHero> team = playerHeroRepo.findAllById(playerHeroIds);
        Hero boss = heroRepo.findById(bossHeroId).orElseThrow();

        currentState = battleService.startBattle(team, boss);
        return battleService.toDTO(currentState);
    }

    /**
     * 🎮 Joue un tour manuellement (héros ou boss).
     */
    @PostMapping("/turn")
    public BattleStateDTO performTurn(@RequestParam int actorIndex,
                                      @RequestParam Long skillId,
                                      @RequestBody List<Integer> targetIndexes) {
        if (currentState == null) throw new IllegalStateException("Aucun combat en cours");

        BattleParticipant actor = currentState.getParticipants().get(actorIndex);
        var skill = actor.getSkills().stream()
                .filter(s -> s.getId().equals(skillId))
                .findFirst()
                .orElseThrow();

        List<BattleParticipant> targets = targetIndexes.stream()
                .map(i -> currentState.getParticipants().get(i))
                .toList();

        battleService.performTurn(currentState, actor, skill, targets);
        return battleService.toDTO(currentState);
    }

    /**
     * 🧠 Fait jouer automatiquement le boss (IA) s’il est prêt.
     */
    @PostMapping("/ai-turn")
    public BattleStateDTO performAITurn() {
        if (currentState == null) throw new IllegalStateException("Aucun combat en cours");

        battleService.performAITurn(currentState);
        return battleService.toDTO(currentState);
    }

    /**
     * 👁️ Permet d’afficher l’état actuel du combat sans jouer.
     */
    @GetMapping("/status")
    public BattleStateDTO getCombatStatus() {
        if (currentState == null) throw new IllegalStateException("Aucun combat en cours");

        return battleService.toDTO(currentState);
    }

    /**
     * 🔄 Réinitialise le combat (utile pour debug ou relancer).
     */
    @PostMapping("/reset")
    public String resetCombat() {
        currentState = null;
        return "Combat réinitialisé.";
    }
}
