package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class SummonService {

    private static final int SUMMON_COST = 50;

    private final HeroRepository heroRepository;
    private final PlayerHeroRepository playerHeroRepository;
    private final BannerRepository bannerRepository;


    public SummonService(HeroRepository heroRepository,
    PlayerHeroRepository playerHeroRepository,
    BannerRepository bannerRepository) {
this.heroRepository = heroRepository;
this.playerHeroRepository = playerHeroRepository;
this.bannerRepository = bannerRepository;
}


public Optional<Banner> getActiveBanner() {
    LocalDateTime now = LocalDateTime.now();
    return bannerRepository.findFirstByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(now, now);
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
        Optional<Banner> activeBanner = getActiveBanner();
        if (activeBanner.isEmpty() || !activeBanner.get().getFeaturedHeroes().contains(hero)) {
            return Optional.empty(); // Héros non disponible
        }
    
        if (user.getDiamonds() < SUMMON_COST) {
            return Optional.empty();
        }
    
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
