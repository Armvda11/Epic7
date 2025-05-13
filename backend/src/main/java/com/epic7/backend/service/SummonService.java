package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Service de gestion des invocations de héros dans le jeu.
 * 
 * Ce service gère les invocations de héros, y compris la vérification des
 * bannières actives,
 * la probabilité d'invocation en fonction de la rareté du héros et la mise à
 * jour des diamants du joueur.
 * @author yannis
 */
@Service
public class SummonService {

    private final BannerRepository bannerRepository;

    /**
     * Constructeur du service d'invocation.
     * @param heroRepository         Le dépôt de héros pour accéder aux données des héros.
     * @param bannerRepository       Le dépôt de bannières pour accéder aux données des bannières.
     */ 
    public SummonService(HeroRepository heroRepository,
            PlayerHeroRepository playerHeroRepository,
            BannerRepository bannerRepository) {
        this.bannerRepository = bannerRepository;
    }

    /**
     * Récupère la bannières actives actuelles.
     * @return Les bannières actives actuelles, ou une valeur vide si aucune bannière n'est active.
     */
    @Transactional(readOnly = true)
    public ArrayList<Banner> getActiveBanner() {
        Instant now = Instant.now();
        System.out.println("Current time: " + now);
        System.out.println("Active banners: " + bannerRepository.findAllByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(now, now));

        return bannerRepository.findAllByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(now, now);
    }

    /**
     * Récupère la probabilité d'invocation en fonction de la rareté du héros.
     * @param rarity La rareté du héros.
     * @return La probabilité d'invocation pour cette rareté.
     */
    private double getProbabilityByRarity(Rarity rarity) {
        return switch (rarity) {
            case NORMAL -> 0.68;
            case RARE -> 0.20;
            case EPIC -> 0.10;
            case LEGENDARY -> 0.02;
            default -> 0.0;
        };
    }

        /**
     * Récupère la probabilité d'invocation en fonction de la rareté de l'équipement.
     * @param element L'équipement.
     * @return La probabilité d'invocation pour cette rareté.
     */
    private double getProbabilityByRarityEquip(Equipment equipment) {
        return switch (equipment.getRarity()) {
            case "NORMAL" -> 0.68;
            case "RARE" -> 0.20;
            case "EPIC" -> 0.10;
            case "LEGENDARY" -> 0.02;
            default -> 0.0;
        };
    }

    /**
     * Effectue une invocation de héros pour un utilisateur donné.
     * @param user L'utilisateur effectuant l'invocation.
     * @param banner La bannière d'invocation.
     * @return Un objet SummonResult si l'invocation a réussi, sinon une valeur vide.
     */
    @Transactional
    public Optional<SummonResult> performSummon(User user,Banner banner) {
        // Vérifier si l'utilisateur a suffisamment de diamants
        if (user.getDiamonds() < banner.getCout()) {
            return Optional.empty();
        }
        // Lui faire payer
        user.setDiamonds(user.getDiamonds() -  banner.getCout());

        // Mélanger la liste des héros de la bannière
        List<Hero> melangeHeros = new ArrayList<>(banner.getFeaturedHeroes());
        Collections.shuffle(melangeHeros);
        // Parcourir les héros de la bannière active
        for (Hero hero : melangeHeros) {

            // Calculer la probabilité d'invocation
            double probability = getProbabilityByRarity(hero.getRarity());
            double draw = Math.random();

            if (draw < probability) {
                // Ajouter le héros à l'utilisateur
                user.addHeros(hero, 1);
                return Optional.of(new SummonResult(hero, null));
            }
        }
        // Si aucun héros n'a été invoqué, retourner un équipement
        List<Equipment> tousEquipments = banner.getFeaturedEquipments();
        double draw = Math.random();
        if (!tousEquipments.isEmpty()) {
            Collections.shuffle(tousEquipments);
            for (Equipment equipment : tousEquipments) {
                draw = draw - draw / tousEquipments.size();
                double probability = getProbabilityByRarityEquip(equipment);
                if (draw < probability) { 
                    user.addEquipment(equipment, 1);
                    return Optional.of(new SummonResult(null, equipment));
                }
            }
        }
        // Si aucun héros ni équipement n'a été invoqué, retourner une valeur vide  
        return Optional.empty();
    }

    /**
     * Récupère un héros spécifique par son ID.
     * @param heroId L'ID d'une bannière à récupérer.
     * @return Un objet Banner si trouvé, sinon une valeur vide.
     */
    @Transactional(readOnly = true)
    public Optional<Banner> getBannerById(Long bannerId) {
        return bannerRepository.findById(bannerId);
    }
    
}