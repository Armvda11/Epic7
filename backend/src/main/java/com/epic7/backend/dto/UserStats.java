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
public class UserStats {
    private String username;
    private int level;
    private String registerDate;
    private String lastLoginDate;
    private int rank;
    private String arenaTier; // Changed from int to String
    private int winNumber;
    private int loseNumber;
    private int heroesNumber;
    private String guild;
    private int friendNumber;
    private String friendshipStatus; // "NONE", "PENDING", "ACCEPTED", "REQUESTED"
}