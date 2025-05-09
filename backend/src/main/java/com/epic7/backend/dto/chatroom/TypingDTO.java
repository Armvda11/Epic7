package com.epic7.backend.dto.chatroom;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TypingDTO {
    private String user;
    private boolean typing;
    private Long roomId;
}
