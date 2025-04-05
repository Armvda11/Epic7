package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
/**
 * Service pour gérer les invocations de héros.
 * Permet d'effectuer des invocations de héros, de gérer les bannières et
 * de vérifier la disponibilité des héros.
 * @author yannis
 */
@Service
public class SummonService {

    public static final int SUMMON_COST = 50; // Coût d'une invocation en diamants

    private final PlayerHeroRepository playerHeroRepository; 
    private final BannerRepository bannerRepository;

    /**
     * Constructeur du service d'invocation.
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
     * Récupère la bannière active actuelle.
     * @return La bannière active actuelle, ou une valeur vide si aucune bannière n'est active.
     */
    @Transactional(readOnly = true)
    public Optional<Banner> getActiveBanner() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime end = now.plusDays(1);
        return bannerRepository.findFirstByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(now, end);
    }

    /**
     * Récupère la probabilité d'invocation en fonction de la rareté du héros.
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
     * Effectue une invocation aléatoire de héros pour un utilisateur donné.
     * @param user L'utilisateur effectuant l'invocation.
     * @return Un PlayerHero si l'invocation a réussi, sinon une valeur vide.
     */
    @Transactional
    public Optional<PlayerHero> performRandomSummon(User user) {
        // Vérifier si une bannière active existe
        Optional<Banner> activeBanner = getActiveBanner();
        if (activeBanner.isEmpty()) {
            return Optional.empty(); // Pas de bannière active
        }

        // Vérifier si l'utilisateur a suffisamment de gemmes
        if (user.getDiamonds() < SUMMON_COST) {
            return Optional.empty(); // Pas assez de ressources
        }

        // Déduire le coût de l'invocation
        user.setDiamonds(user.getDiamonds() - SUMMON_COST);

        // Récupérer les héros de la bannière active
        List<Hero> featuredHeroes = activeBanner.get().getFeaturedHeroes();
        if (featuredHeroes.isEmpty()) {
            return Optional.empty(); // Aucun héros disponible
        }
        // Effectuer l'invocation aléatoire
        Hero summonedHero = featuredHeroes.stream()
        .min((hero1, hero2) -> hero1.getRarity().compareTo(hero2.getRarity()))
        .orElse(null); // Si la liste est vide, summonedHero sera null


        for (Hero hero : featuredHeroes) {
            double probability = getProbabilityByRarity(hero.getRarity());
            if (Math.random() < probability) {
                summonedHero = hero;
                break;
            }
        }

        if (summonedHero == null) {
            return Optional.empty(); // Aucun héros invoqué
        }

        // Créer et sauvegarder le héros invoqué
        PlayerHero playerHero = new PlayerHero(user, summonedHero);
        playerHeroRepository.save(playerHero);
        return Optional.of(playerHero);
    }

}
