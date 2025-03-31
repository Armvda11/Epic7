package com.epic7.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MessageDTO {
    private Long id;
    private String senderName; // Nom de l'expéditeur
    private String recipientName; // Nom du destinataire
    private String subject; // Sujet du message
    private String message; // Contenu du message
    private String createdAt; // Date de création du message
    private String validUntil; // Date de validité du message
    private boolean isRead; // Statut de lecture du message
    private String targetShopItemsId; // Liste des ID des objets associés au message
}
