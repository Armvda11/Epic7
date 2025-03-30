// src/main/java/com/epic7/backend/dto/PlayerHeroViewDTO.java
package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PlayerHeroViewDTO {
    private Long id;
    private String name;
    private String element;
    private String rarity;
    private int level;
    private boolean locked;

    // Stats totales (base + bonus équipements)
    private int totalAttack;
    private int totalDefense;
    private int totalSpeed;
    private int totalHealth;
}
