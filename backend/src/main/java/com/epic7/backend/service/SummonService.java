package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Optional;

/**
 * Service de gestion des invocations de héros dans le jeu.
 * 
 * Ce service gère les invocations de héros, y compris la vérification des
 * bannières actives,
 * la probabilité d'invocation en fonction de la rareté du héros et la mise à
 * jour des diamants du joueur.
 * @author hermas
 */
@Service
public class SummonService {

    public static final int SUMMON_COST = 50; // Coût d'une invocation en diamants

    private final PlayerHeroRepository playerHeroRepository; 
    private final BannerRepository bannerRepository;

    /**
     * Constructeur du service d'invocation.
     * @param heroRepository         Le dépôt de héros pour accéder aux données des héros.
     * @param playerHeroRepository   Le dépôt de héros du joueur pour gérer les héros du joueur.
     * @param bannerRepository       Le dépôt de bannières pour accéder aux données des bannières.
     */ 
    public SummonService(HeroRepository heroRepository,
            PlayerHeroRepository playerHeroRepository,
            BannerRepository bannerRepository) {
        this.playerHeroRepository = playerHeroRepository;
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

        System.out.println("est ce que ca marche ? 🚀");
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
     * Effectue une invocation de héros pour un utilisateur donné.
     * @param user L'utilisateur effectuant l'invocation.
     * @param banner La bannière d'invocation.
     * @return Un objet PlayerHero si l'invocation a réussi, sinon une valeur vide.
     */
    @Transactional
    public Optional<PlayerHero> performSummon(User user,Banner banner) {
        // Vérifier si l'utilisateur possède tous les héros de la bannière
        if (userOwnsAllHeroesInBanner(user, banner)) {
            return Optional.empty();
        }
        // Vérifier si l'utilisateur a suffisamment de diamants
        if (user.getDiamonds() < SUMMON_COST) {
            return Optional.empty();
        }
        // Lui faire payer
        user.setDiamonds(user.getDiamonds() - SUMMON_COST);
        // Parcourir les héros de la bannière active
        for (Hero hero : banner.getFeaturedHeroes()) {
            // Vérifier si l'utilisateur possède déjà ce héros
            boolean alreadyOwned = playerHeroRepository.existsByUserAndHero(user, hero);
            if (alreadyOwned) {
                continue; // Passer au héros suivant
            }

            // Calculer la probabilité d'invocation
            double probability = getProbabilityByRarity(hero.getRarity());
            double draw = Math.random();

            if (draw < probability) {
                // Ajouter le héros à l'utilisateur
                PlayerHero playerHero = new PlayerHero(user, hero);
                user.getOwnedHeroes().add(playerHero);
                return Optional.of(playerHero);
            }
        }
        return Optional.empty();
    }
    /**
     * Vérifie si l'utilisateur possède tous les héros de la bannière.
     * @param user   L'utilisateur à vérifier.
     * @param banner La bannière à vérifier.
     * @return true si l'utilisateur possède tous les héros de la bannière, false sinon.
     */
    @Transactional(readOnly = true)
    public boolean userOwnsAllHeroesInBanner(User user, Banner banner) {

        // Vérifier si l'utilisateur possède chaque héros de la bannière
        for (Hero hero : banner.getFeaturedHeroes()) {
            boolean ownsHero = playerHeroRepository.existsByUserAndHero(user, hero);
            if (!ownsHero) {
                return false; // Si un héros n'est pas possédé, retourner false
            }
        }

        return true; // Si tous les héros sont possédés, retourner true
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