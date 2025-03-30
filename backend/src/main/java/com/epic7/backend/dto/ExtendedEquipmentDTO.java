package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Représente un équipement dans le jeu.
 * Contient des informations sur l'équipement, y compris son nom, son type,
 * sa rareté, son niveau, son expérience, s'il est équipé ou non,
 * et ses bonus d'attaque, de défense, de vitesse et de santé.
 * @author hermas
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ExtendedEquipmentDTO {
    private Long id;
    private String name;
    private String type;
    private String rarity;
    private int attackBonus;
    private int defenseBonus;
    private int speedBonus;
    private int healthBonus;
    private int level;
    private int experience;
    private boolean equipped;

    // Statistiques totales (base + bonus équipements)
    private Long equippedHeroId;
    private String equippedHeroName;
}
