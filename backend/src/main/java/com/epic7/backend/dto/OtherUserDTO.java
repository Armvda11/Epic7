package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Représente les informations d'un autre utilisateur dans le système.
 * Contient les données de base d'un utilisateur à afficher.
 */

@Data
@AllArgsConstructor
public class OtherUserDTO {
    private Long id;
    private String username;
    private int level;
    private String friendshipStatus; // Statut: ACCEPTED, PENDING, REQUESTED
}
