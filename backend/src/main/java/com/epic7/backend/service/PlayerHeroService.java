package com.epic7.backend.service;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.repository.PlayerHeroRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerHeroService {

    private final PlayerHeroRepository playerHeroRepository;

    public PlayerHeroService(PlayerHeroRepository playerHeroRepository) {
        this.playerHeroRepository = playerHeroRepository;
    }

    /**
     * Gagne de l'expérience et monte de niveau si nécessaire.
     */
    @Transactional
    public void gainExperience(PlayerHero hero, int xp) {
        if (hero.isLocked()) {
            throw new IllegalStateException("Ce héros est verrouillé et ne peut pas gagner d'expérience.");
        }

        hero.setExperience(hero.getExperience() + xp);

        while (hero.getExperience() >= experienceRequiredForNextLevel(hero.getLevel())) {
            hero.setExperience(hero.getExperience() - experienceRequiredForNextLevel(hero.getLevel()));
            hero.setLevel(hero.getLevel() + 1);
        }

        playerHeroRepository.save(hero);
    }

    /**
     * Verrouille le héros (ex : pour empêcher vente ou modification).
     */
    @Transactional
    public void lockHero(PlayerHero hero) {
        hero.setLocked(true);
        playerHeroRepository.save(hero);
    }

    /**
     * Déverrouille le héros.
     */
    @Transactional
    public void unlockHero(PlayerHero hero) {
        hero.setLocked(false);
        playerHeroRepository.save(hero);
    }

    /**
     * Formule de progression du niveau (modifiable facilement).
     */
    private int experienceRequiredForNextLevel(int currentLevel) {
        return 100 + (currentLevel * 25);
    }


    public PlayerHero findById(Long heroId) {
        return playerHeroRepository.findById(heroId).orElse(null);
    }
} 
