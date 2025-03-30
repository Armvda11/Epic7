package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;


/**
 * Représente l'adhésion d'un utilisateur à une guilde.
 * Contient des informations sur le rôle de l'utilisateur dans la guilde et la date d'adhésion.
 * @author hermas
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
    private String role; // leader, officer, member

    @Column(name = "join_date")
    private Instant joinDate = Instant.now(); // Date d'adhésion à la guilde
}
