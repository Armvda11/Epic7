package com.epic7.backend.service;

import java.util.ArrayList; // Utile pour avoir un panier
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
    private final PlayerHeroRepository heroPlayerRepo;
    private final PlayerEquipmentRepository equipmentPlayerRepo;

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

        switch (item.getType()) {
            case HERO -> {
                Hero hero = heroRepo.findHeroWithItemById(item.getId())
                        .orElse(null);
                if (hero == null) {
                    return "Héros non disponible a l'achat pour le moment.";
                }
            }

            case EQUIPMENT ->{
                Equipment equipment = equipmentRepo.findEquipmentWithItemById(item.getId())
                        .orElse(null);
                if (equipment == null) {
                    return "Équipement non disponible a l'achat pour le moment.";
                }

            }

            default -> {
                messageService.sendShopItemsMessage(user, List.of(item.getId()), item.getEndAt(), null);
                // Ne rien faire pour les autres types
            }
        }

        
        PlayerHero playerHerotemp = heroPlayerRepo.findPlayerHeroWithItemById(item.getId(), user.getId()).orElse(null);
        if(playerHerotemp!= null){
            // Vérifier si le héros appartient à l'utilisateur
            return "Vous possédez déjà ce héros.";
        }

        PlayerEquipment playerEquipmenttemp = equipmentPlayerRepo.findPlayerEquipmentWithItemById(item.getId()).orElse(null);
        if(playerEquipmenttemp != null){
            // Vérifier si l'équipement appartient à l'utilisateur
            return "Vous possédez déjà cet équipement.";
        }


        // Vérifier limitation
        if (item.getMaxPurchasePerUser() != null) {
            int count = purchaseRepo.countByUserAndShopItem(user, item);
            if (count >= item.getMaxPurchasePerUser()) {
                //throw new IllegalStateException("Limite d'achat atteinte.");
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
                // Enregistrer le héros possédé par l'utilisateur
                PlayerHero playerHero = new PlayerHero();
                playerHero.setUser(user);
                playerHero.setHero(hero);
                // playerHeroRepo.save(playerHero); géré par le cascade de hibernate

                // Ajouter le héros à la liste des héros possédés par l'utilisateur
                user.getOwnedHeroes().add(playerHero);

                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat d'un héros", "Vous avez acheté le héros : " + hero.getName(), null);
            }
            case EQUIPMENT -> {
                Equipment eq = equipmentRepo.findEquipmentWithItemById(item.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable"));
                // Enregistrer l'équipement possédé par l'utilisateur

                PlayerEquipment playerEquipment = new PlayerEquipment();
                playerEquipment.setUser(user);
                playerEquipment.setEquipment(eq);
                // playerEquipRepo.save(playerEquipment); // Inutile car géré par le cascade de hibernate
                // Ajouter l'équipement à la liste des équipements possédés par l'utilisateur
                user.getEquipments().add(playerEquipment);

                // Envoi d'un message au joueur pour l'informer de l'achat
                messageService.sendMessage("Shop", user, "Achat d'équipement",
                        "Vous avez acheté l'équipement : " + eq.getName(), null);
            }
            case GOLD -> {
                // Envoi d'un message au joueur pour l'informer de l'achat
                /* messageService.sendMessage(system, user, "Achat d'or",
                        "Vous avez acheté de l'or : " + item.getPriceInGold()); */
                // Ajouter l'or à la liste des équipements possédés par l'utilisateur
                user.setGold(user.getGold() + item.getPriceInGold());
            }
            case DIAMOND -> {
                // Envoi d'un message au joueur pour l'informer de l'achat
                /* messageService.sendMessage(system, user, "Achat de diamants",
                        "Vous avez acheté des diamants : " + item.getPriceInDiamonds()); */
                // Ajouter les diamants à la liste des équipements possédés par l'utilisateur
                user.setDiamonds(user.getDiamonds() + item.getPriceInDiamonds());
            }
            
            default -> {
                throw new IllegalArgumentException("Type d'article non pris en charge");
            }
        }

        // Enregistrer l'achat dans la base de données
        userRepository.save(user); // Enregistrer l'utilisateur avec les mises à jour
        purchaseRepo.save(ShopPurchase.builder().user(user).shopItem(item).quantity(1).totalDiamondsPrice(item.getPriceInDiamonds()).totalGoldPrice(item.getPriceInGold())
        .totalPrice(item.getPriceInDiamonds()+item.getPriceInGold()).build());
        return "Achat réussi !";
    }
}