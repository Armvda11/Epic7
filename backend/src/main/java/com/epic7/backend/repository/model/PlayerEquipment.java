package com.epic7.backend.repository.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Représente l'équipement d'un joueur dans le jeu.
 * Contient des informations sur l'utilisateur, l'équipement de base,
 * le héros sur lequel l'équipement est utilisé, ainsi que les niveaux et bonus associés.
 * @author hermas
 */
@Entity
@Table(name = "player_equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlayerEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // L'utilisateur qui possède l'équipement
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false) 
    private User user;

    // L'équipement de base (ex. "Épée du feu", "Bottes d'acier")
    @ManyToOne(optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Le héros sur lequel l’équipement est utilisé (nullable si en inventaire)
    @ManyToOne
    @JoinColumn(name = "player_hero_id")
    private PlayerHero playerHero;
    

    @Builder.Default
    @Column(nullable = false)
    private int level = 1;

    @Builder.Default
    @Column(nullable = false)
    private int experience = 0;

    @Column(name = "bonus_attack")
    private int bonusAttack; 

    @Column(name = "bonus_defense")
    private int bonusDefense;

    @Column(name = "bonus_speed")
    private int bonusSpeed;

    @Column(name = "bonus_health")
    private int bonusHealth;

    public boolean isEquipped() {
        return playerHero != null;
    }


}
