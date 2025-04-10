package com.epic7.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@AllArgsConstructor
public class MessageDTO {
    private Long id;
    private Long senderId; // ID de l'expéditeur
    private String senderName; // Nom de l'expéditeur
    private String recipientName; // Nom du destinataire
    private String subject; // Sujet du message
    private String message; // Contenu du message
    private String createdAt; // Date de création du message
    private String validUntil; // Date de validité du message
    private List<Long> shopItemIds;

    @JsonProperty("isRead")
    private boolean isRead; // Statut de lecture du message
    
    @JsonProperty("containItems")
    private boolean containItems; // Indique si le message contient des objets
    
    @JsonProperty("isFriendRequest")
    private boolean isFriendRequest; // Indique si le message est une demande d'ami
}
