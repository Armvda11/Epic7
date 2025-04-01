package com.epic7.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MessageInfoDTO {
    private Long id;
    private String senderName; // Nom de l'expéditeur
    
    private String subject; // Sujet du message
    private String createdAt; // Date de création du message
    private String validUntil; // Date de validité du message
    private boolean isRead; // Statut de lecture du message
    private boolean containItems; // Indique si le message contient des objets
    private boolean isFriendRequest; // Indique si le message est une demande d'ami
}
