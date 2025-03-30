package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    private static final int SUMMON_COST = 50; // Coût d'une invocation en diamants

    private final HeroRepository heroRepository; 
    private final PlayerHeroRepository playerHeroRepository; 
    private final BannerRepository bannerRepository;

    /**
     * Constructeur du service d'invocation.
     *
     * @param heroRepository         Le dépôt de héros pour accéder aux données des héros.
     * @param playerHeroRepository   Le dépôt de héros du joueur pour gérer les héros du joueur.
     * @param bannerRepository       Le dépôt de bannières pour accéder aux données des bannières.
     */
    public SummonService(HeroRepository heroRepository,
            PlayerHeroRepository playerHeroRepository,
            BannerRepository bannerRepository) {
        this.heroRepository = heroRepository;
        this.playerHeroRepository = playerHeroRepository;
        this.bannerRepository = bannerRepository;
    }

    /**
     * Récupère la bannière active actuelle.
     
     * @return La bannière active actuelle, ou une valeur vide si aucune bannière n'est active.
     */
    public Optional<Banner> getActiveBanner() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime end = now.plusDays(1);
        return bannerRepository.findFirstByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(now, end);
    }

    /**
     * Récupère la probabilité d'invocation en fonction de la rareté du héros.
     *
     * @param rarity La rareté du héros.
     * @return La probabilité d'invocation pour cette rareté.
     */
    private double getProbabilityByRarity(Rarity rarity) {
        return switch (rarity) {
            case NORMAL -> 0.5;
            case RARE -> 0.3;
            case EPIC -> 0.15;
            case LEGENDARY -> 0.05;
            default -> 0.0;
        };
    }

    /**
     * Effectue une invocation de héros pour un utilisateur donné.
     *
     * @param user L'utilisateur effectuant l'invocation.
     * @param hero Le héros à invoquer.
     * @return Un objet PlayerHero si l'invocation a réussi, sinon une valeur vide.
     */
    @Transactional
    public Optional<PlayerHero> performSummon(User user, Hero hero) {

        // Obtenir toutes les bannières actives et vérifier si le héros est disponible
        // dans l'une d'elles
        Optional<Banner> activeBanner = getActiveBanner();
        if (activeBanner.isEmpty() || !activeBanner.get().getFeaturedHeroes().contains(hero)) {
            return Optional.empty(); // Héros non disponible
        }

        // Vérifier si l'utilisateur a suffisamment de diamants pour invoquer
        // (50 diamants par invocation)
        if (user.getDiamonds() < SUMMON_COST) {
            return Optional.empty();
        }

        // Calculer la probabilité d'invocation en fonction de la rareté du héros
        // et effectuer l'invocation
        double probability = getProbabilityByRarity(hero.getRarity());
        double draw = Math.random();

        user.setDiamonds(user.getDiamonds() - SUMMON_COST);

        if (draw < probability) {
            PlayerHero playerHero = new PlayerHero(user, hero);
            playerHeroRepository.save(playerHero);
            return Optional.of(playerHero);
        }

        return Optional.empty();
    }

    public Optional<Hero> getHeroById(String code) {
        return heroRepository.findByCode(code);
    }
}
