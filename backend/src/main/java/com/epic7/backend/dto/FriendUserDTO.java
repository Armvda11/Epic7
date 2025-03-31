package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Représente les informations d'un ami dans le système.
 * Contient les données de base d'un utilisateur ami à afficher.
 */
@Data
@AllArgsConstructor
public class FriendUserDTO {
    private Long id;
    private String username;
    private int level;     // Niveau de l'ami
}
