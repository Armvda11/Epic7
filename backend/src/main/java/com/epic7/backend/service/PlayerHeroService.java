package com.epic7.backend.service;

import com.epic7.backend.dto.PlayerHeroViewDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.PlayerHeroRepository;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerHeroService {

    private final PlayerHeroRepository playerHeroRepository;

    public PlayerHeroService(PlayerHeroRepository playerHeroRepository) {
        this.playerHeroRepository = playerHeroRepository;
    }
    
    public List<PlayerHero> getAllByUser(User user) {
        return playerHeroRepository.findByUser(user);
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

    /**
     * Construit un DTO pour afficher les informations du héros joueur.
     * @param hero Le héros joueur
     * @return Un DTO contenant les informations du héros
     */
    public PlayerHeroViewDTO buildPlayerHeroViewDTO(PlayerHero hero) {
        Hero base = hero.getHero();
        int atk = base.getBaseAttack();
        int def = base.getBaseDefense();
        int spd = base.getBaseSpeed();
        int hp = base.getHealth();

        // Ajout des bonus d'équipements équipés
        for (PlayerEquipment eq : hero.getOwnedEquipments()) {
            if (eq.isEquipped()) {
                atk += eq.getEquipment().getAttackBonus();
                def += eq.getEquipment().getDefenseBonus();
                spd += eq.getEquipment().getSpeedBonus();
                hp += eq.getEquipment().getHealthBonus();
            }
        }

        return new PlayerHeroViewDTO(
                hero.getId(),
                base.getName(),
                base.getElement().name(),
                base.getRarity().name(),
                hero.getLevel(),
                hero.isLocked(),
                atk,
                def,
                spd,
                hp);
    }
}
