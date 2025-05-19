package com.epic7.backend.dto.chatroom;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypingDTO {
    private String user;
    // Permet de marquer le début et la fin de l'utilisateur qui écrit
    private boolean typing;
    private Long roomId;
}
