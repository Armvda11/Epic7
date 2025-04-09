package com.epic7.backend.model.enums;
/**
 * Enumération représentant les types de chat disponibles dans le jeu.
 * 
 * @see com.epic7.backend.model.chat.ChatMessage
 */
public enum ChatType {
    /**
     * Chat de guilde.
     * Utilisé pour les messages envoyés dans le chat de la guilde.
     */
    GUILD,

    /**
     * Chat de combat.
     * Utilisé pour les messages envoyés pendant un combat.
     */
    FIGHT,

    /**
     * Chat de jeu.
     * Utilisé pour les messages envoyés dans le chat général du jeu.
     */
    GLOBAL
}
