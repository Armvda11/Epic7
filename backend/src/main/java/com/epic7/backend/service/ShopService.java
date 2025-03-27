package com.epic7.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.ShopItem;
import com.epic7.backend.model.ShopPurchase;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.PlayerEquipmentRepository;
import com.epic7.backend.repository.PlayerHeroRepository;
import com.epic7.backend.repository.ShopItemRepository;
import com.epic7.backend.repository.ShopPurchaseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopItemRepository shopItemRepo;
    private final ShopPurchaseRepository purchaseRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipmentRepo;
    private final PlayerHeroRepository playerHeroRepo;
    private final PlayerEquipmentRepository playerEquipRepo;

    public List<ShopItem> getAvailableItems() {
        LocalDateTime now = LocalDateTime.now();
        return shopItemRepo.findByStartAtBeforeAndEndAtAfter(now, now);
    }

    public String purchaseItem(User user, Long itemId) {
        ShopItem item = shopItemRepo.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Article introuvable"));

        // Vérifier limitation
        if (item.getMaxPurchasePerUser() != null) {
            int count = purchaseRepo.countByUserAndShopItem(user, item);
            if (count >= item.getMaxPurchasePerUser()) {
                throw new IllegalStateException("Limite d'achat atteinte.");
            }
        }

        // Vérifier le coût
        if (item.getPriceInGold() > user.getGold() || item.getPriceInDiamonds() > user.getDiamonds()) {
            throw new IllegalStateException("Fonds insuffisants.");
        }

        // Déduire les ressources
        user.setGold(user.getGold() - item.getPriceInGold());
        user.setDiamonds(user.getDiamonds() - item.getPriceInDiamonds());

        // Ajouter l'objet selon le type
        switch (item.getType()) {
            case HERO -> {
                Hero hero = heroRepo.findById(item.getTargetId())
                        .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));
                playerHeroRepo.save(new PlayerHero(user, hero));
            }
            case EQUIPMENT -> {
                Equipment eq = equipmentRepo.findById(item.getTargetId())
                        .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable"));
                playerEquipRepo.save(PlayerEquipment.builder().user(user).equipment(eq).build());
            }
            case GOLD -> user.setGold(user.getGold() + 1000); // Exemple
            case DIAMOND -> user.setDiamonds(user.getDiamonds() + 100); // Exemple
        }

        purchaseRepo.save(ShopPurchase.builder().user(user).shopItem(item).quantity(1).build());
        return "Achat réussi !";
    }
}
