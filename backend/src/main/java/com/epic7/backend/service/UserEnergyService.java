package com.epic7.backend.service;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Service de gestion de l'énergie des utilisateurs.
 * 
 * Ce service gère la régénération de l'énergie des utilisateurs dans le jeu.
 * Il met à jour l'énergie d'un utilisateur en fonction du temps écoulé depuis
 * la dernière mise à jour de son énergie.
 * @author hermas
 */
@Service
public class UserEnergyService {

    private final UserRepository userRepository;

    public UserEnergyService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Met à jour l'énergie de l'utilisateur en fonction du temps écoulé depuis
     * la dernière mise à jour.
     * 
     * @param user L'utilisateur dont l'énergie doit être mise à jour.
     */
    @Transactional
    public void updateEnergy(User user) {
        // Vérifie si l'utilisateur a déjà 100 d'énergie
        if (user.getEnergy() >= 100) return;


        Instant now = Instant.now();
        Instant lastUpdate = user.getLastEnergyUpdate();
        
        long minutes = Duration.between(lastUpdate, now).toMinutes();
        if (minutes < 5) return;
        // Calcule le nombre de points d'énergie à régénérer
        long pointsToRegen = minutes / 5;
        int newEnergy = Math.min(100, user.getEnergy() + (int) pointsToRegen);
        user.setEnergy(newEnergy);
        user.setLastEnergyUpdate(now);
        // Enregistre les modifications de l'énergie de l'utilisateur
        userRepository.save(user);
    }
}
