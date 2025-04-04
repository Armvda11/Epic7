package com.epic7.backend.dto.simple;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Représente une action de compétence dans un combat :
 * - Le héros qui agit
 * - La compétence choisie
 * - La cible
 * @author Hermas
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimpleSkillActionRequest {
    private Long playerHeroId; 
    private Long skillId;
    private Long targetId;
}
