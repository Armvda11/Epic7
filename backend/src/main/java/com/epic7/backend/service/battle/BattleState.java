package com.epic7.backend.service.battle;

import com.epic7.backend.dto.battleDTO.CombatLogDTO;
import lombok.Data;

import java.util.*;

/**
 * Contient l'état courant du combat : participants, tour en cours, logique de priorité.
 */
@Data
public class BattleState {
    private List<BattleParticipant> participants = new ArrayList<>();
    private int turnNumber = 0;
    private List<CombatLogDTO> logs = new ArrayList<>();

    private static final double SPEED_MULTIPLIER = 0.3;
    private static final double MAX_GAUGE = 1000.0;

    /**
     * Avance le temps jusqu'à ce qu'au moins un participant atteigne 1000 d'actionGauge.
     * On calcule le temps minimal nécessaire pour que le plus rapide atteigne 1000,
     * puis on l'applique à tout le monde proportionnellement à leur vitesse.
     */
    public void advanceTimeToNextTurn() {
        double minTicksNeeded = participants.stream()
            .filter(BattleParticipant::isAlive)
            .mapToDouble(p -> (MAX_GAUGE - p.getActionGauge()) / (p.getTotalSpeed() * SPEED_MULTIPLIER))
            .min()
            .orElse(0);

        for (BattleParticipant p : participants) {
            if (p.isAlive()) {
                double increment = p.getTotalSpeed() * SPEED_MULTIPLIER * minTicksNeeded;
                p.setActionGauge(Math.min(p.getActionGauge() + increment, MAX_GAUGE));
            }
        }
    }

    public Optional<BattleParticipant> getReadyParticipant() {
        return participants.stream()
            .filter(p -> p.isAlive() && p.isReady())
            .findFirst();
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
            .anyMatch(p -> (p.getSide().equals("ENEMY") || p.getSide().equals("BOSS")) && p.isAlive());

        return !playersAlive || !enemiesAlive;
    }

    public String getWinnerSide() {
        if (!isCombatOver()) return null;
        boolean playersAlive = participants.stream()
            .anyMatch(p -> p.getSide().equals("PLAYER") && p.isAlive());
        return playersAlive ? "PLAYER" : "ENEMY";
    }
}
