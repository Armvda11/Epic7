package com.epic7.backend.dto.chatroom;

import com.epic7.backend.repository.model.chat.ChatMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for chat messages.
 * Used for transferring chat message data between the server and client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private Long roomId;
    private Long senderId;
    private String sender;
    private String content;
    private String timestamp;
    
    /**
     * Creates a ChatMessageDTO from a ChatMessage entity without checking if it's from the current user
     * 
     * @param message The chat message entity
     * @return A new ChatMessageDTO with isFromCurrentUser set to false
     */
    public static ChatMessageDTO fromEntity(ChatMessage message) {
        if (message == null) {
            return null;
        }
        
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(message.getId());
        dto.setRoomId(message.getChatRoom().getId());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp().toString());
        
        // Use the username field instead of toString() to ensure proper format
        dto.setSender(message.getSender().getUsername());
        dto.setSenderId(message.getSender().getId());
        
        return dto;
    }
}