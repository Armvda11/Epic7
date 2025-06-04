package com.epic7.backend.repository.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Représente le bannissement d'un utilisateur d'une guilde.
 * Contient des informations sur l'utilisateur banni, la guilde, la raison et la date du bannissement.
 * @author corentin
 */
@Entity
@Table(name = "guild_bans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GuildBan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Identifiant unique du bannissement

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user; // L'utilisateur banni

    @ManyToOne(optional = false)
    @JoinColumn(name = "guild_id")
    private Guild guild; // La guilde dont l'utilisateur est banni

    @ManyToOne
    @JoinColumn(name = "banned_by")
    private User bannedBy; // L'utilisateur qui a effectué le bannissement

    @Column(name = "ban_date")
    private Instant banDate = Instant.now(); // Date du bannissement

    @Column(name = "unban_date")
    private Instant unbanDate; // Date de dé-bannissement (si applicable)
    
    @Column(length = 255)
    private String reason; // Raison du bannissement
}
