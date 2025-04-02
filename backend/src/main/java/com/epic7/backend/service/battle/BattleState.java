package com.epic7.backend.service.battle;


import lombok.Data;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import com.epic7.backend.dto.battleDTO.CombatLogDTO;

/**
 * Contient l'état courant du combat : participants, tour en cours, logique de priorité.
 */
@Data
public class BattleState {
    private List<BattleParticipant> participants = new ArrayList<>();
    private int turnNumber = 0;

    private static final double SPEED_MULTIPLIER = 0.3;

    private List<CombatLogDTO> logs = new ArrayList<>();


    public void incrementActionGauges() {
        for (BattleParticipant p : participants) {
            if (p.isAlive()) {
                double increment = p.getTotalSpeed() * SPEED_MULTIPLIER;
                p.setActionGauge(p.getActionGauge() + increment);
            }
        }
    }

    public Optional<BattleParticipant> getNextTurnParticipant() {
        return participants.stream()
                .filter(p -> p.isAlive() && p.isReady())
                .max(Comparator.comparingDouble(BattleParticipant::getActionGauge));
    }

    public List<BattleParticipant> getAliveEnemiesOf(String side) {
        return participants.stream()
                .filter(p -> !p.getSide().equals(side) && p.isAlive())
                .toList();
    }

    public List<BattleParticipant> getAliveAlliesOf(String side) {
        return participants.stream()
                .filter(p -> p.getSide().equals(side) && p.isAlive())
                .toList();
    }

    public boolean isCombatOver() {
        boolean playersAlive = participants.stream()
            .anyMatch(p -> p.getSide().equals("PLAYER") && p.isAlive());
    
        boolean enemiesAlive = participants.stream()
            .anyMatch(p -> p.getSide().equals("ENEMY") || p.getSide().equals("BOSS") && p.isAlive());
    
        return !playersAlive || !enemiesAlive;
    }
    
    public String getWinnerSide() {
        if (!isCombatOver()) return null;
        boolean playersAlive = participants.stream()
            .anyMatch(p -> p.getSide().equals("PLAYER") && p.isAlive());
        return playersAlive ? "PLAYER" : "ENEMY";
    }
    
}