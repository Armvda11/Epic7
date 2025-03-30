package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EquipmentDTO {
    private Long id;
    private String name;
    private String type;
    private String rarity;
    private int level;
    private int experience;
    private boolean equipped;
    private int attackBonus;
private int defenseBonus;
private int speedBonus;
private int healthBonus;

}
