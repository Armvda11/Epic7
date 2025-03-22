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


    @Column(name = "attack_bonus")
    private int attackBonus;

    @Column(name = "defense_bonus")
    private int defenseBonus;

    @Column(name = "speed_bonus")
    private int speedBonus;

    @ManyToOne
    @JoinColumn(name = "player_hero_id")
    private PlayerHero equippedTo;
}
