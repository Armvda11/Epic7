package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.epic7.backend.model.enums.GuildRank;
import com.epic7.backend.model.enums.GuildRole;

/**
 * Représente une guilde dans le jeu.
 * Contient des informations sur le nom, la description et les membres de la guilde.
 * @author hermas corentin
 */
// TODO : Ajouter une image pour la guilde
// TODO : Ajouter un système de niveau de guilde
// TODO : Ajouter un système de points de guilde
// TODO : Ajouter un système de rangs de guilde
// TODO : Ajouter un système de guerre de guilde
// TODO : Ajouter un système de don de ressources
// TODO : Ajouter un système de chat de guilde
// TODO : Ajouter un système de quêtes de guilde
@Entity
@Table(name = "guilds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Guild {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique de la guilde

    @Column(nullable = false, unique = true)
    private String name; // Nom de la guilde (ex. "Fairy tail ", "TFC gang", etc.)

    private String description; // Description de la guilde (ex. "raconter de la merde pour décrire ca guilde", etc.)

    @OneToMany(mappedBy = "guild", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GuildMembership> members; // Liste des membres de la guilde

    @Column(nullable = false)
    private int level = 1; // Niveau de la guilde (ex. 1, 2, 3, etc.)

    @Column(nullable = false)
    private int gold = 0; // Quantité d'or possédée par la guilde (ex. 0, 100, 1000, etc.)

    @Column(nullable = false)
    private int GuildPoints = 0; // Quantité de points de guilde possédée par la guilde (ex. 0, 100, 1000, etc.)
    
    @Column(nullable = false)
    private int experience = 0; // Expérience de la guilde, utilisée pour monter de niveau
    
    @Column(nullable = false)
    private boolean isOpen = true; // Si la guilde est ouverte (tout le monde peut rejoindre) ou fermée (invitation uniquement)

    @Enumerated(EnumType.STRING)
    private GuildRank rank = GuildRank.BRONZE; // Rang de la guilde (ex. "Bronze", "Argent", "Or", "Platine", "Diamant", etc.)

    @Column(name = "ranking")
    private int ranking = 0; // Classement de la guilde (ex. 1, 2, 3, etc.) (classement mondial)
    
    @Column(name = "creation_date")
    private Instant creationDate = Instant.now(); // Date de création de la guilde

    @Column(name = "creator_id")
    private Long creatorId; // ID du créateur de la guilde

    @Column(name = "max_members")
    private int maxMembers = 20;

    @ElementCollection
    @CollectionTable(
        name = "guild_pending_invitations",
        joinColumns = @JoinColumn(name = "guild_id")
    )
    @Column(name = "invited_user_id")
    private List<Long> pendingInvitationRequestsUsers = new ArrayList<>(); // Liste des utilisateurs invités à rejoindre la guilde
    
    @ElementCollection
    @CollectionTable(
        name = "guild_pending_adhesions",
        joinColumns = @JoinColumn(name = "guild_id")
    )
    @Column(name = "requesting_user_id")
    private List<Long> pendingAdhesionRequestUsers = new ArrayList<>(); // Liste des utilisateurs qui ont demandé à rejoindre la guilde

    @Enumerated(EnumType.STRING)
    @Column(name = "chat_admin_role")
    private GuildRole chatAdminRole = GuildRole.LEADER; // Rôle de l'administrateur de la guilde dans le chat
    /*
     * Méthode pour obtenir le leader de la guilde.
     * Parcourt la liste des membres et retourne l'ID du membre avec le rôle de leader.
     * @return L'ID du leader de la guilde ou null si aucun leader n'est trouvé.
     * @author corentin
     */
    public Long getLeader() {
        for (GuildMembership member : members) {
            if (member.getRole() == GuildRole.LEADER) {
                return member.getUser().getId();
            }
        }
        return null; // Si aucun leader n'est trouvé, retourner null
    }

    public void addGold(int amount) {
        this.gold += amount;
    }
    public void removeGold(int amount) {
        this.gold -= amount;
    }
    public void addGuildPoints(int amount) {
        this.GuildPoints += amount;
    }
    public void removeGuildPoints(int amount) {
        this.GuildPoints -= amount;
    }

    public void addMember(GuildMembership member) {
        this.members.add(member);
        member.setGuild(this);
    }

    public void removeMember(GuildMembership member) {
        this.members.remove(member);
        member.setGuild(null);
    }

    /**
     * Ajoute de l'expérience à la guilde et vérifie si elle monte de niveau.
     * @param amount Quantité d'expérience à ajouter
     * @return true si la guilde a gagné un niveau, false sinon
     */
    public boolean addExperience(int amount) {
        this.experience += amount;
        
        // Vérifier si la guilde monte de niveau (formule simple: 1000 * niveau actuel)
        int expNeeded = 1000 * this.level;
        if (this.experience >= expNeeded) {
            this.experience -= expNeeded;
            this.level++;
            this.maxMembers += 5; // Augmenter le nombre maximum de membres à chaque niveau
            return true;
        }
        return false;
    }

    /**
     * Ajoute un utilisateur à la liste des invitations en attente.
     * @param userId L'ID de l'utilisateur invité
     * @return true si l'invitation a été ajoutée, false si l'utilisateur était déjà invité
     */
    public boolean addPendingInvitation(Long userId) {
        if (pendingInvitationRequestsUsers == null) {
            pendingInvitationRequestsUsers = new ArrayList<>();
        }
        
        if (!pendingInvitationRequestsUsers.contains(userId)) {
            pendingInvitationRequestsUsers.add(userId);
            return true;
        }
        return false;
    }
    
    /**
     * Supprime un utilisateur de la liste des invitations en attente.
     * @param userId L'ID de l'utilisateur invité
     * @return true si l'invitation a été supprimée, false si l'utilisateur n'était pas invité
     */
    public boolean removePendingInvitation(Long userId) {
        if (pendingInvitationRequestsUsers == null) {
            return false;
        }
        return pendingInvitationRequestsUsers.remove(userId);
    }
    
    /**
     * Ajoute un utilisateur à la liste des demandes d'adhésion en attente.
     * @param userId L'ID de l'utilisateur demandant à rejoindre
     * @return true si la demande a été ajoutée, false si l'utilisateur avait déjà demandé
     */
    public boolean addPendingAdhesion(Long userId) {
        if (pendingAdhesionRequestUsers == null) {
            pendingAdhesionRequestUsers = new ArrayList<>();
        }
        
        if (!pendingAdhesionRequestUsers.contains(userId)) {
            pendingAdhesionRequestUsers.add(userId);
            return true;
        }
        return false;
    }
    
    /**
     * Supprime un utilisateur de la liste des demandes d'adhésion en attente.
     * @param userId L'ID de l'utilisateur demandant à rejoindre
     * @return true si la demande a été supprimée, false si l'utilisateur n'avait pas demandé
     */
    public boolean removePendingAdhesion(Long userId) {
        if (pendingAdhesionRequestUsers == null) {
            return false;
        }
        return pendingAdhesionRequestUsers.remove(userId);
    }
    
    /**
     * Vérifie si un utilisateur est invité à rejoindre la guilde.
     * @param userId L'ID de l'utilisateur à vérifier
     * @return true si l'utilisateur est invité, false sinon
     */
    public boolean isUserInvited(Long userId) {
        return pendingInvitationRequestsUsers != null && pendingInvitationRequestsUsers.contains(userId);
    }
    
    /**
     * Vérifie si un utilisateur a demandé à rejoindre la guilde.
     * @param userId L'ID de l'utilisateur à vérifier
     * @return true si l'utilisateur a demandé à rejoindre, false sinon
     */
    public boolean hasUserRequestedToJoin(Long userId) {
        return pendingAdhesionRequestUsers != null && pendingAdhesionRequestUsers.contains(userId);
    }
}
