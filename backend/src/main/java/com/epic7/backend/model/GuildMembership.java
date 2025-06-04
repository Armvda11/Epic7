package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

import com.epic7.backend.model.enums.GuildRole;


/**
 * Représente l'adhésion d'un utilisateur à une guilde.
 * Contient des informations sur le rôle de l'utilisateur dans la guilde et la date d'adhésion.
 * @author hermas corentin
 */
@Entity
@Table(name = "guild_membership", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "guild_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GuildMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique de l'adhésion

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user; // L'utilisateur membre de la guilde

    @ManyToOne(optional = false)
    @JoinColumn(name = "guild_id")
    private Guild guild; // La guilde à laquelle l'utilisateur appartient

    @Column(nullable = false)
    private GuildRole role = GuildRole.NOUVEAU; // Rôle dans la guilde: LEADER, CONSEILLER, VETERAN, MEMBRE, NOUVEAU
    
    @Column(nullable = false)
    private int contributions = 0; // Points de contribution à la guilde

    @Column(name = "join_date")
    private Instant joinDate = Instant.now(); // Date d'adhésion à la guilde
    
    @Column(name = "last_activity")
    private Instant lastActivity = Instant.now(); // Dernière activité dans la guilde
    

    /**
     * Ajoute des points de contribution au membre.
     * @param points Nombre de points à ajouter
     */
    public void addContribution(int points) {
        this.contributions += points;
        this.lastActivity = Instant.now();
    }
}
