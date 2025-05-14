package com.epic7.backend.service.battle.model;

import lombok.AllArgsConstructor;
import lombok.*;
/**
 * Représente un participant au combat (héros du joueur ou boss).
 * Cette classe est utilisée uniquement pendant le combat (pas persistée).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class BattleParticipant {
    private Long id;           // ID du PlayerHero ou du Hero (pour le boss)
    private String name;       // Nom du héros
    private int maxHp;         // Points de vie max
    private int currentHp;     // Points de vie actuels
    private int attack;        // Attaque
    private int defense;       // Défense
    private int speed;         // Vitesse
    private boolean isPlayer;  // true si héros du joueur, false si boss
    private String userId;     // ID de l'utilisateur propriétaire du héros (pour RTA)
}
