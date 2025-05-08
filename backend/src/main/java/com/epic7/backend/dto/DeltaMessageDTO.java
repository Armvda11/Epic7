package com.epic7.backend.dto;

import com.epic7.backend.model.chat.ChatMessage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Delta Message DTO for ultra-efficient transfer of message sequences
 * Optimized to minimize network payload by only sending changes between consecutive messages
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeltaMessageDTO {
    private Long id;
    // Delta fields - only included when they differ from previous message
    private Long roomId;
    private String roomName;
    private Long senderId;
    private String senderUsername;
    private String senderAvatarUrl;
    private String content;
    private Long timestampDelta; // Time difference from previous message in milliseconds
    private boolean compressed;

    /**
     * Create a delta DTO from the current and previous message
     */
    public static DeltaMessageDTO fromMessages(ChatMessage current, ChatMessage previous) {
        DeltaMessageDTO dto = new DeltaMessageDTO();
        dto.setId(current.getId());
        
        // Only include fields that differ from previous message
        if (previous == null || !current.getChatRoom().getId().equals(previous.getChatRoom().getId())) {
            dto.setRoomId(current.getChatRoom().getId());
            dto.setRoomName(current.getChatRoom().getName());
        }
        
        if (previous == null || !current.getSender().getId().equals(previous.getSender().getId())) {
            dto.setSenderId(current.getSender().getId());
            dto.setSenderUsername(current.getSender().getUsername());
           // dto.setSenderAvatarUrl(current.getSender().getAvatarUrl());
        }
        
        // Compress content if needed
        String content = current.getContent();
        if (content != null && content.length() > 1000) {
            dto.setContent(ChatMessageDTO.compressString(content));
            dto.setCompressed(true);
        } else {
            dto.setContent(content);
            dto.setCompressed(false);
        }
        
        // Calculate time delta from previous message
        if (previous != null) {
            long currentTime = current.getTimestamp().toEpochMilli();
            long previousTime = previous.getTimestamp().toEpochMilli();
            dto.setTimestampDelta(currentTime - previousTime);
        } else {
            // For first message, store absolute time
            dto.setTimestampDelta(current.getTimestamp().toEpochMilli());
        }
        
        return dto;
    }
    
    /**
     * Convert a list of messages to delta format
     */
    public static List<DeltaMessageDTO> fromMessageSequence(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<DeltaMessageDTO> result = new ArrayList<>(messages.size());
        ChatMessage previous = null;
        
        for (ChatMessage current : messages) {
            result.add(fromMessages(current, previous));
            previous = current;
        }
        
        return result;
    }
    
    /**
     * Get the absolute timestamp based on the delta and previous absolute timestamp
     */
    public Instant getAbsoluteTimestamp(Instant previousTimestamp) {
        if (previousTimestamp == null) {
            // First message, timestampDelta is absolute
            return Instant.ofEpochMilli(timestampDelta);
        } else {
            // Calculate based on previous timestamp and delta
            return Instant.ofEpochMilli(previousTimestamp.toEpochMilli() + timestampDelta);
        }
    }
}