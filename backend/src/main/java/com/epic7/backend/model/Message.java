package com.epic7.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

import java.time.Instant;

/**
 * Entité représentant un message.
 * Chaque message a un identifiant, un expéditeur, un destinataire,
 * un sujet, un message, une date de création, une date de validité et un statut de lecture.
 *
 * @author corentin
 */

@Entity
@Table(name = "messages")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender; // Expéditeur du message

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient; // Destinataire du message

    @Column(nullable = false)
    private String subject; // Sujet du message

    @Column(nullable = false)
    private String message; // Contenu du message

    @Column(name = "created_at", nullable = false)
    private Instant createdAt; // Date de création du message

    @Column(name ="valid_until", nullable = false)
    private Instant validUntil; // Date de validité du message

    @Column(name = "is_read", nullable = false)
    private boolean isRead; // Statut de lecture du message

    @Column(name="target_shop_items_id")
    private List<Long> targetShopItemsId; // Liste des ID des objets associés au message
}
