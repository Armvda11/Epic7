package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "heroes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Hero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String element; // Fire, Ice, Earth, Dark, Light...

    @Column(nullable = false)
    private Integer health;

    @Column(name = "base_attack", nullable = false)
    private int baseAttack;

    @Column(name = "base_defense", nullable = false)
    private int baseDefense;

    @Column(name = "base_speed", nullable = false)
    private int baseSpeed;

    @Column(nullable = false)
    private String rarity; // Normal, Rare, Epic, Legendary
}
