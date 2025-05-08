package com.epic7.backend.dto;

import com.epic7.backend.model.chat.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Data Transfer Object for batches of chat messages with pagination information.
 * Used for efficient loading of chat message history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageBatchDTO {
    private List<ChatMessageDTO> messages;
    private boolean hasMoreMessages;
    
    /**
     * Creates a ChatMessageBatchDTO from a list of ChatMessage entities
     * 
     * @param messages The chat message entities
     * @param hasMore Flag indicating if there are more messages available
     * @return A new ChatMessageBatchDTO
     */
    public static ChatMessageBatchDTO fromEntities(List<ChatMessage> messages, boolean hasMore) {
        if (messages == null) {
            return new ChatMessageBatchDTO(List.of(), false);
        }
        
        List<ChatMessageDTO> messageDTOs = messages.stream()
            .map(message -> ChatMessageDTO.fromEntity(message, null))
            .collect(Collectors.toList());
            
        return new ChatMessageBatchDTO(messageDTOs, hasMore);
    }
}