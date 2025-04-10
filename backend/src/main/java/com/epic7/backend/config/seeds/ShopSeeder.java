package com.epic7.backend.config.seeds;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
            ShopItem item1 = createShopItem("Hwayoung", "Heroïne super badasse", 1L , ShopItemType.HERO,10, 1000, 1, 5, Instant.now().plus(7, ChronoUnit.DAYS));
            ShopItem item2 = createShopItem("Mavuika", "Heros de Genshin ???", 3L, ShopItemType.HERO, 10, 5000, 1, 5, null);
            ShopItem item3 = createShopItem("Épée de feu", "Une épée venant tout droit des enfers", 1L, ShopItemType.EQUIPMENT, 5, 300, 1, 5, Instant.now().plus(7, ChronoUnit.DAYS));
            ShopItem item4 = createShopItem("100 Or", "Des  pièces d'or pour devenir le roi des pirates !", 1L, ShopItemType.GOLD, 10, 0, 100, 9999, Instant.now().plus(7, ChronoUnit.DAYS));
            shopItemRepo.saveAll(List.of(item1, item2, item3,item4));
            System.out.println("✅ Items de la boutique créés.");
        }
        
    }
    
    private ShopItem createShopItem(String name, String description, Long itemId, ShopItemType type, int priceInDiamonds,int priceInGold,
    int quantityPerPurchase, int maxPurchasePerUser, Instant endAt) {
        return ShopItem.builder()
                .name(name)
                .description(description)
                .type(type)
                .priceInGold(priceInGold)
                .limitedTime(false)
                .quantityPerPurchase(quantityPerPurchase)
                .startAt(null)
                .endAt(endAt)
                .targetItemId(itemId)
                .priceInDiamonds(priceInDiamonds)
                .maxPurchasePerUser(maxPurchasePerUser)
                .build();
    }

}
