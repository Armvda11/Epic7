package com.epic7.backend.dto.simple;

import lombok.Data;

/**
 * Représente l'action envoyée par le joueur lors de son tour.
 * Contient l'identifiant de la compétence utilisée (skillId)
 * et l'identifiant de la cible (targetId).
 */
@Data
public class SimpleActionRequest {
    private Long skillId;   // Pour l'instant non utilisé mais prêt pour le futur
    private Long targetId;  // ID du héros ou boss ciblé
} 
