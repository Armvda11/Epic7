package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class SummonService {

    private static final int SUMMON_COST = 50;

    private final HeroRepository heroRepository;
    private final PlayerHeroRepository playerHeroRepository;

    public SummonService(HeroRepository heroRepository,
                         PlayerHeroRepository playerHeroRepository) {
        this.heroRepository = heroRepository;
        this.playerHeroRepository = playerHeroRepository;
    }
    private double getProbabilityByRarity(Rarity rarity) {
        return switch (rarity) {
            case NORMAL -> 0.5;
            case RARE-> 0.3;
            case EPIC -> 0.15;
            case LEGENDARY-> 0.05;
            default -> 0.0;
        };
    }

    @Transactional
    public Optional<PlayerHero> performSummon(User user, Hero hero) {
        int summonCost = SUMMON_COST;


        

        if (user.getDiamonds() < summonCost) {
            return Optional.empty(); // pas assez de diamant
        }

        double probability = getProbabilityByRarity(hero.getRarity());
        double draw = Math.random();

        // retirer des diamants
        user.setDiamonds(user.getDiamonds() - summonCost);

        // Toujours ajouter à la liste même si c'est un doublon
        if (draw < probability) {
            PlayerHero playerHero = new PlayerHero(user, hero);
            playerHeroRepository.save(playerHero);
            return Optional.of(playerHero);
        }

        return Optional.empty(); // Invocation échouée
    }


    public Optional<Hero> getHeroById(String code) {
        return heroRepository.findByCode(code);
    }
}
