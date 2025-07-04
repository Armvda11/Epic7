package com.epic7.backend.service;


import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.epic7.backend.dto.ShopItemDTO;
import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.ShopItem;
import com.epic7.backend.model.ShopPurchase;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.EquipmentRepository;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.ShopItemRepository;
import com.epic7.backend.repository.ShopPurchaseRepository;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service de gestion des achats dans le boutique.
 * Il gère les achats d'articles, la vérification des limites d'achat,
 * @author Wilkens
 */
@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopItemRepository shopItemRepo;
    private final ShopPurchaseRepository purchaseRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipmentRepo;


    private final UserRepository userRepository;

    // Service de messagerie dédié à l'utilisation du shop
    private final MessageService messageService;

    public List<ShopItem> getAvailableItems() {
        //LocalDateTime now = LocalDateTime.now();
        //LocalDateTime end= LocalDateTime.now().plusDays(1);
        return shopItemRepo.findAll();
    }


    /**
     * Effectue un achat d'article dans la boutique.
     * Vérifie les limites d'achat et le coût avant de procéder à l'achat.
     * @param user      L'utilisateur effectuant l'achat.
     * @param itemId    L'identifiant de l'article à acheter.
     * @return          Un message de confirmation de l'achat.
     */
    @Transactional
    public String purchaseItem(User user, Long itemId) {


        // Save the user first to ensure the ID is generated and available
        if (user.getId() == null) {
            // If the user doesn't have an ID yet, save the user first
            user = userRepository.save(user);  // Save the user in the database to generate the ID
        }

        if (itemId == null) {
            return "L'ID de l'article ne peut pas être nul";
        }

        ShopItem item = shopItemRepo.findById(itemId)
                .orElse(null);
                
        if (item == null) {
            return "Article introuvable";
        }

        // Validations de sécurité
        if (item.getQuantityPerPurchase() <= 0) {
            return "Quantité d'achat invalide";
        }
        
        if (item.getPriceInGold() < 0 || item.getPriceInDiamonds() < 0) {
            return "Prix invalide";
        }

        switch (item.getType()) {
            case HERO -> {
                Hero hero = heroRepo.findHeroWithItemById(item.getId())
                        .orElse(null);
                if (hero == null) {
                    return "Héros non disponible a l'achat pour le moment.";
                }
            }

            case EQUIPMENT -> {
                Equipment equipment = equipmentRepo.findEquipmentWithItemById(item.getId())
                        .orElse(null);
                if (equipment == null) {
                    return "Équipement non disponible a l'achat pour le moment.";
                }
            }

            default -> {
                // Ne rien faire pour les autres types
            }
        }

        // Vérifier limitation
        if (item.getMaxPurchasePerUser() != null) {
            int count = purchaseRepo.countByUserAndShopItem(user, item);
            if (count + item.getQuantityPerPurchase() > item.getMaxPurchasePerUser()) {
                return "Limite d'achat atteinte.";
            }
        }

        // Vérifier le coût
        if (item.getPriceInGold() > user.getGold() || item.getPriceInDiamonds() > user.getDiamonds()) {
            //throw new IllegalStateException("Fonds insuffisants.");
            return "Fonds insuffisants.";
        }

        
        // Déduire les ressources
        user.setGold(user.getGold() - item.getPriceInGold());
        user.setDiamonds(user.getDiamonds() - item.getPriceInDiamonds());

        // Ajouter l'objet selon le type
        switch (item.getType()) {
            case HERO -> {
                Hero hero = heroRepo.findHeroWithItemById(item.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));

                // Ajouter le héros à la liste des héros possédés par l'utilisateur
                // ou mettre à jour son niveau d'éveil
                user.addHeros(hero, item.getQuantityPerPurchase());

                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat d'un héros", "Vous avez acheté le héros : " + hero.getName() + " (x " + item.getQuantityPerPurchase().toString() + ")", null);
            }
            case EQUIPMENT -> {
                Equipment equipment = equipmentRepo.findEquipmentWithItemById(item.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable"));

                // Ajouter le ou les équipements à la liste des équipements possédés par l'utilisateur
                user.addEquipment(equipment, item.getQuantityPerPurchase());

                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat d'équipement",
                        "Vous avez acheté l'équipement : " + equipment.getName() + " (x " + item.getQuantityPerPurchase().toString() + ")", null);
            }
            case GOLD -> {
                // Achat d'or avec des diamants uniquement
                if (item.getPriceInGold() > 0) {
                    throw new IllegalStateException("L'or ne peut pas être acheté avec de l'or");
                }
                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat d'or",
                        "Vous avez acheté de l'or : " + item.getQuantityPerPurchase(), null);
                // Ajouter l'or à l'utilisateur
                user.setGold(user.getGold() + item.getQuantityPerPurchase());
            }
            case DIAMOND -> {
                // Achat de diamants avec de l'or uniquement
                if (item.getPriceInDiamonds() > 0) {
                    throw new IllegalStateException("Les diamants ne peuvent pas être achetés avec des diamants");
                }
                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat de diamants",
                        "Vous avez acheté des diamants : " + item.getQuantityPerPurchase(), null);
                // Ajouter les diamants à l'utilisateur
                user.setDiamonds(user.getDiamonds() + item.getQuantityPerPurchase());
            }
            
            default -> {
                throw new IllegalArgumentException("Type d'article non pris en charge");
            }
        }

        // Enregistrer l'achat dans la base de données
        userRepository.save(user); // Enregistrer l'utilisateur avec les mises à jour
        
        // Calculer le prix total basé sur la quantité achetée
        int totalDiamondsPrice = item.getPriceInDiamonds() * item.getQuantityPerPurchase();
        int totalGoldPrice = item.getPriceInGold() * item.getQuantityPerPurchase();
        
        purchaseRepo.save(ShopPurchase.builder()
            .user(user)
            .shopItem(item)
            .quantity(item.getQuantityPerPurchase())
            .totalDiamondsPrice(totalDiamondsPrice)
            .totalGoldPrice(totalGoldPrice)
            .totalPrice(totalDiamondsPrice + totalGoldPrice)
            .build());
        return "Achat réussi !";
    }


     public ShopItemDTO toDto(ShopItem item) {
        return new ShopItemDTO(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getPriceInDiamonds(),
                item.getPriceInGold(),
                item.getStartAt(),
                item.getEndAt(),
                item.getMaxPurchasePerUser(),
                item.getType()
        );
    }

    public List<ShopItemDTO> toDtoList(List<ShopItem> items) {
        return items.stream().map(this::toDto).collect(Collectors.toList());
    }
}