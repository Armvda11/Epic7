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
    private String element; // Ex: Fire, Water, Wind, Dark

    @Column(name = "base_attack", nullable = false)
    private int baseAttack;

    @Column(name = "base_defense", nullable = false)
    private int baseDefense;

    @Column(name = "base_speed", nullable = false)
    private int baseSpeed;
}
