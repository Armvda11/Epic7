package com.epic7.backend.service.battle.simple;

import lombok.Data;

import java.util.List;

/**
 * Représente l'état global d'un combat en cours.
 */
@Data
public class SimpleBattleState {

    /**
     * Liste des participants au combat, triés par vitesse (ordre de jeu).
     */
    private List<SimpleBattleParticipant> participants;

    /**
     * Index du participant actuellement actif dans la liste.
     */
    private int currentTurnIndex;

    /**
     * Indique si le combat est terminé.
     */
    private boolean isFinished;

    /**
     * Journal des événements du combat (logs textuels).
     */
    private List<String> logs;
} 
