package com.epic7.backend.dto.simple;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Représente le résultat d'une action de compétence dans un combat.
 * Il contient l'état de la bataille, les dégâts infligés, l'identifiant de la cible
 * et le type d'action (DAMAGE ou HEAL). (il peut être redondant avec le SimpleSkillActionRequest qui contient déjà l'id de la cible)
 * @author Hermas
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SkillActionResultDTO {
    private SimpleBattleStateDTO battleState;
    private int damageDealt;
    private Long targetId;
    private String type; // "DAMAGE" ou "HEAL"
}
