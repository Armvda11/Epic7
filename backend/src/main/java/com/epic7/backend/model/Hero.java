package com.epic7.backend.model;

import com.epic7.backend.model.enums.Element;
import com.epic7.backend.model.enums.Rarity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;


import java.util.UUID;

@Entity
@Table(name = "heroes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Element element;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rarity rarity;

    @Min(0)
    @Column(name = "base_attack", nullable = false)
    private int baseAttack;

    @Min(0)
    @Column(name = "base_defense", nullable = false)
    private int baseDefense;

    @Min(0)
    @Column(name = "base_speed", nullable = false)
    private int baseSpeed;

    @Min(1)
    @Column(nullable = false)
    private int health;

    @Column(nullable = false, unique = true, updatable = false)
    private String code;

    @PrePersist
    public void generateCodeIfNull() {
        if (this.code == null || this.code.isEmpty()) {
            this.code = generateCodeFromName();
        }
    }

    private String generateCodeFromName() {
        return (name.substring(0, Math.min(3, name.length())).toUpperCase() + "-" + UUID.randomUUID().toString().substring(0, 8));
    }
}
