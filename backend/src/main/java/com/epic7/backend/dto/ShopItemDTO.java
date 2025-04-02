package com.epic7.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ShopItemDTO {
    private String name;
    private String description;
    private int priceInDiamonds;
    private int priceInGold;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private int maxPurchasePerUser;
    //private String type; // HERO, EQUIPMENT, GOLD, DIAMOND
    //private String rarity; // 3⭐, 4⭐, 5⭐
}
