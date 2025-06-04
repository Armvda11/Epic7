package com.epic7.backend.model;

import com.epic7.backend.model.enums.EquipmentType;

import jakarta.persistence.*;
import lombok.*;


/**
 * Représente un équipement dans le jeu.
 * Chaque équipement a un nom, un type, une rareté et des bonus associés.
 * @author hermas
 */

@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique de l'équipement

    @Column(nullable = false)
    private String name; // Nom de l'équipement (ex. "Épée du feu", "Bottes d'acier", etc.)

    @Enumerated(EnumType.STRING)
    private EquipmentType type; // Type de l'équipement (ex. arme, armure, collier, etc.)

    @Column(nullable = false)
    private String rarity; //rareté des l'équipemeent (ex : normal, rare, légendaire)
    
    @Column(name = "attack_bonus")
    private int attackBonus ; // bonus d'attaque de l'équipement

    @Column(name = "defense_bonus")
    private int defenseBonus; // bonus de défense de l'équipement

    @Column(name = "speed_bonus")
    private int speedBonus; // bonus de vitesse de l'équipement

    @Column(name = "health_bonus")
    private int healthBonus; // bonus de vie de l'équipement
    
    @Column(name ="level")
    private int level; // niveau de l'équipement

    @Column(name = "experience")
    private int experience; // expérience de l'équipement

}
