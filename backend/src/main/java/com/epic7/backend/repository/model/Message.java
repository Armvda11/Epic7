package com.epic7.backend.repository.model;

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
public class Message {

    public Message(User sender, User recipient, String subject, String message, Instant createdAt, Instant validUntil, List<Long> targetShopItemsId) {
        this.sender = sender.getUsername(); // Utiliser le username au lieu de l'objet User
        this.recipient = recipient;
        this.subject = subject;
        this.message = message;
        this.createdAt = createdAt;
        this.validUntil = validUntil;
        this.targetShopItemsId = targetShopItemsId;
        this.isRead = false; // Par défaut, le message n'est pas lu
        this.isFriendRequest = false; // Par défaut, ce n'est pas une demande d'ami
        this.containItems = !targetShopItemsId.isEmpty();
    }
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id", nullable = false)
    private String sender; // Expéditeur du message

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

    @Column(name="target_shop_items_id")
    private List<Long> targetShopItemsId; // Liste des ID des objets associés au message

    @Column(name = "is_read", nullable = false)
    private boolean isRead; // Statut de lecture du message

    @Column(name = "is_friend_request", nullable = false)
    private boolean isFriendRequest; // Indique si le message est une demande d'ami
    
    @Column(name = "contain_items", nullable = false)
    private boolean containItems; // Indique si le message contient des objets

    /**
     * Méthode utilitaire pour vérifier si l'expéditeur est un utilisateur système
     * @return true si l'expéditeur est un utilisateur système, false sinon
     */
    @Transient // Cette méthode n'est pas mappée à la base de données
    public boolean isFromSystem() {
        return sender != null && 
            (sender.equals("System") || 
            sender.equals("Shop") || 
            sender.equals("Epic7Team"));
    }

}
