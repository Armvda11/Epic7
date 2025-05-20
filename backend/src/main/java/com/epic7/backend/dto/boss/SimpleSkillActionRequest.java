package com.epic7.backend.dto.boss;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Représente une action de compétence dans un combat :
 * - Le héros qui agit
 * - La compétence choisie
 * - La cible
 * - L'identifiant de l'utilisateur (pour la validation)
 * @author Hermas
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleSkillActionRequest {
    private Long playerHeroId; 
    private Long skillId;
    private Long targetId;
    private String userId;    // Ajout du champ userId pour résoudre l'erreur NullPointerException
}
