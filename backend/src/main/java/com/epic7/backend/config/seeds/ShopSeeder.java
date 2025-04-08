package com.epic7.backend.config.seeds;

import java.util.List;

import org.springframework.stereotype.Component;

import com.epic7.backend.model.ShopItem;
import com.epic7.backend.model.enums.ShopItemType;
import com.epic7.backend.repository.ShopItemRepository;

import lombok.*;

@Component
@RequiredArgsConstructor
public class ShopSeeder {

    private final ShopItemRepository shopItemRepo;

    public void seedShopItems() {
        if(shopItemRepo.count() == 0) {
            ShopItem item1 = createShopItem("Hwayoung", "Heros de je ne sais quoi", ShopItemType.HERO, 10, 10, 5);
            ShopItem item2 = createShopItem("Mavuika", "Heros de je m'en balec", ShopItemType.HERO, 10, 5, 5);
            ShopItem item3 = createShopItem("Épée de feu", "Epee pour niquer ta race", ShopItemType.EQUIPMENT, 5, 15, 5);
            ShopItem item4 = createShopItem("Or", "De l'or pour les riches", ShopItemType.GOLD, 10, 7,10);
            shopItemRepo.saveAll(List.of(item1, item2, item3,item4));
            System.out.println("✅ Items de la boutique créés.");
        }
        
    }
    
    private ShopItem createShopItem(String name, String description, ShopItemType type, int priceInDiamonds,int priceInGold,
     int maxPurchasePerUser) {
        return ShopItem.builder()
                .name(name)
                .description(description)
                .type(type)
                .priceInGold(priceInGold)
                .limitedTime(false)
                .startAt(null)
                .endAt(null)
                .targetId(null)
                .priceInDiamonds(priceInDiamonds)
                .maxPurchasePerUser(maxPurchasePerUser)
                .build();
    }

}
