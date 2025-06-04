package com.epic7.backend.dto.boss;

import com.epic7.backend.repository.model.enums.ShopItemType;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RewardDTO {
    private ShopItemType type;     // Exemple : "gold"
    private int amount;      // Exemple : 1000
    private String message;  // Exemple : "Victoire !"
}
