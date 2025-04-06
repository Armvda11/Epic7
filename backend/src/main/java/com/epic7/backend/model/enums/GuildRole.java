package com.epic7.backend.model.enums;

/**
 * Enumération représentant les différents rôles disponibles dans une guilde.
 * Les rôles ont différents niveaux de permissions et de responsabilités.
 */
public enum GuildRole {
    LEADER(5),      // Chef de guilde avec toutes les permissions
    CONSEILLER(4),  // Conseiller, peut gérer les membres et certains aspects de la guilde
    VETERAN(3),     // Vétéran, membres expérimentés avec quelques permissions
    MEMBRE(2),      // Membre standard
    NOUVEAU(1);     // Nouveau membre avec des permissions limitées
    
    private final int level;
    
    GuildRole(int level) {
        this.level = level;
    }
    
    /**
     * Obtient le niveau numérique associé au rôle.
     * @return Le niveau du rôle (plus élevé = plus de permissions)
     */
    public int getLevel() {
        return level;
    }
    
    /**
     * Vérifie si ce rôle a au moins le niveau d'autorité requis.
     * @param minRole Le rôle minimum requis
     * @return true si ce rôle a au moins le niveau d'autorité du rôle minimal, false sinon
     */
    public boolean hasAtLeastRole(GuildRole minRole) {
        return this.level >= minRole.level;
    }
    
    /**
     * Convertit une chaîne de caractères en rôle de guilde.
     * @param roleName Le nom du rôle en minuscules (ex: "leader", "conseiller")
     * @return Le rôle correspondant, ou NOUVEAU par défaut si non trouvé
     */
    public static GuildRole fromString(String roleName) {
        try {
            return GuildRole.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            return NOUVEAU; // Rôle par défaut
        }
    }
}
