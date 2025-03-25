package com.epic7.backend.model;

import jakarta.persistence.*;
import com.epic7.backend.model.enums.EquipmentType;
import lombok.*;

@Entity
@Table(name = "equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    private EquipmentType type;

    @Column(nullable = false)
    private String rarity;

    @Column(name = "attack_bonus")
    private int attackBonus;

    @Column(name = "defense_bonus")
    private int defenseBonus;

    @Column(name = "speed_bonus")
    private int speedBonus;

    @Column(name = "health_bonus")
    private int healthBonus;

    @Column(name ="level")
    private int level;

    @Column(name = "experience")
    private int experience;

    @Column(name = "in_use")
    private boolean in_use;
}
