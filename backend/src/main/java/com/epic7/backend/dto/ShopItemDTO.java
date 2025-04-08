package com.epic7.backend.dto;

import java.time.LocalDateTime;

import com.epic7.backend.model.enums.ShopItemType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Représente un objet de la boutique.
 * Contient des informations sur l'objet, y compris son nom, sa description,
 * son prix en diamants et en or, sa date de début et de fin de disponibilité,
 * et le nombre maximum d'achats par utilisateur.
 * @author Wilkens
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ShopItemDTO {
    private Long id;
    private String name;
    private String description;
    private int priceInDiamonds;
    private int priceInGold;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private int maxPurchasePerUser;
    private ShopItemType type; // HERO, EQUIPMENT, GOLD, DIAMOND
    //private String rarity; // 3⭐, 4⭐, 5⭐
}
