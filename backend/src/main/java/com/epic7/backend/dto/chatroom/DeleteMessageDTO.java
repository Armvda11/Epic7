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
    private Long askerId; // ID of the user who asked for the deletion to check if the user is allowed to delete the message
}
