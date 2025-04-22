package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SummonResultDTO {
    private String name;
    private String rarity;
    private String element;
    private int awakeningLevel;
    private String type; // Heros ou Equipement
}