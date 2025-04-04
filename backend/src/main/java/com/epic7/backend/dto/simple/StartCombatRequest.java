package com.epic7.backend.dto.simple;

import lombok.Data;

import java.util.List;

/**
 * Requête de démarrage de combat.
 * Contient :
 * - l'identifiant du héros boss
 * - la liste des identifiants des héros sélectionnés par le joueur
 */
@Data
public class StartCombatRequest {
    private Long bossHeroId;
    private List<Long> selectedPlayerHeroIds;
}
