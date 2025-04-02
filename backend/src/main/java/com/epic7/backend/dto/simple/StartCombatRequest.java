package com.epic7.backend.dto.simple;

import lombok.Data;

/**
 * Requête de démarrage de combat avec l’identifiant du héros à utiliser comme boss.
 */
@Data
public class StartCombatRequest {
    private Long bossHeroId;
}
