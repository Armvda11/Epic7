package com.epic7.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@AllArgsConstructor
public class MessageInfoDTO {
    private Long id;
    private String senderName; // Nom de l'expéditeur
    
    private String subject; // Sujet du message
    private String createdAt; // Date de création du message
    private String validUntil; // Date de validité du message
    
    @JsonProperty("isRead") // ATTENTION JSON filtre le prefix IS (et peut être d'autres)
    private boolean isRead; // Statut de lecture du message
    
    @JsonProperty("containItems")
    private boolean containItems; // Indique si le message contient des objets
    
    @JsonProperty("isFriendRequest")
    private boolean isFriendRequest; // Indique si le message est une demande d'ami
}
