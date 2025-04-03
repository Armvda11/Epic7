// 📁 src/main/java/com/epic7/backend/dto/simple/AutoActionRequest.java
package com.epic7.backend.dto.simple;

import lombok.Data;

/**
 * Requête pour l'action automatique d'un héros joueur.
 * Utilisé pour déterminer quel héros doit jouer avec ses compétences en priorité.
 */
@Data
public class AutoActionRequest {
    private Long playerHeroId;
}
