package com.epic7.backend.dto.chatroom;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteMessageDTO {
    private Long messageId;
    private Long roomId;
    private String sender;
    // ID of the user who asked for the deletion to check if the user
    // is allowed to delete the message
    // Risque de sécurité
    // Le client peut envoyer n'importe quel ID
    // Il faut vérifier si l'utilisateur a le droit de supprimer le message
    // dans le service qui réceptionne la requête
    private Long askerId;
    // Type of chat room (GLOBAL, GUILD, FIGHT)
    // This helps the frontend know which channel to subscribe to for deletions
    private String chatType;
}
