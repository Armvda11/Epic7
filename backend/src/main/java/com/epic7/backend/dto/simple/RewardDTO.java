package com.epic7.backend.dto.simple;

import com.epic7.backend.model.ShopItem;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RewardDTO {
    private ShopItem type;     // Exemple : "gold"
    private int amount;      // Exemple : 1000
    private String message;  // Exemple : "Victoire !"
}
