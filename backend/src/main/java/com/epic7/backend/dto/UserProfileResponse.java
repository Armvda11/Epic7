package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Représente le profil d'un joueur dans le jeu.
 * Contient des informations sur le joueur, y compris son nom,
 * son niveau, sa quantité d'or, de diamants et d'énergie.
 * @author hermas
 */
@Data
@AllArgsConstructor
public class UserProfileResponse {
    private String username;
    private int level;
    private int gold;
    private int diamonds;
    private int energy;
    private String friendshipStatus; // "NONE", "PENDING", "ACCEPTED", "REQUESTED"

    public UserProfileResponse(String username, int level, int gold, int diamonds, int energy) {
        this.username = username;
        this.level = level;
        this.gold = gold;
        this.diamonds = diamonds;
        this.energy = energy;
        this.friendshipStatus = "NONE"; // Default value
    }
}