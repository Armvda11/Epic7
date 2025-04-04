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

/**
 * Service de gestion des héros joueurs.
 * 
 * Ce service gère les opérations liées aux héros joueurs, y compris la
 * récupération des héros d'un utilisateur, l'attribution d'expérience,
 * le verrouillage et le déverrouillage des héros.
 * 
 * @author hermas
 */
@Service
public class PlayerHeroService {

    private final PlayerHeroRepository playerHeroRepository;


    public PlayerHeroService(PlayerHeroRepository playerHeroRepository) {
        this.playerHeroRepository = playerHeroRepository;
    }
    
    /**
     * Récupère tous les héros d'un utilisateur.
     * @param user L'utilisateur dont on veut récupérer les héros.
     * @return Une liste de héros du joueur.
     */
    @Transactional(readOnly = true)
    public List<PlayerHero> getAllByUser(User user) {
        return playerHeroRepository.findByUser(user);
    }
   
    /**
     * Récupère tous les héros d'un utilisateur qui ne sont pas verrouillés.
     * @param user L'utilisateur dont on veut récupérer les héros.
     * @return Une liste de héros du joueur non verrouillés.
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
     * @param hero
     */
    @Transactional
    public void lockHero(PlayerHero hero) {
        hero.setLocked(true);
        playerHeroRepository.save(hero);
    }

    /**
     * Déverrouille le héros (ex : pour permettre vente ou modification).
     * @param hero
     */
    @Transactional
    public void unlockHero(PlayerHero hero) {
        hero.setLocked(false);
        playerHeroRepository.save(hero);
    }

    /**
     * Calcule l'expérience requise pour passer au niveau suivant.
     * @param currentLevel Le niveau actuel du héros.
     * @return L'expérience requise pour passer au niveau suivant.
     */
    private int experienceRequiredForNextLevel(int currentLevel) {
        return 100 + (currentLevel * 25);
    }

    /**
     * Récupère un héros joueur par son ID.
     * @param heroId L'ID du héros joueur.
     * @return Le héros joueur correspondant à l'ID, ou null s'il n'existe pas.
     */
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

    /**
     * Récupère tous les héros d'un utilisateur avec son ID.
     * @param userID L'utilisateur dont on veut récupérer les héros.
     * @return Une liste de héros du joueur non verrouillés.
     */
    @Transactional(readOnly = true)
    public List<PlayerHero> getAllByUserId(Long userID) {
        return playerHeroRepository.findByUserId(userID);
    }

    public PlayerHero findByIdAndUser(Long id, User user) {
        return playerHeroRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("PlayerHero not found or not owned by user"));
    }
    

}
