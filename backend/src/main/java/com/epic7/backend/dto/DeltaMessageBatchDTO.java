package com.epic7.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for transferring batches of delta messages with additional metadata
 * Optimizes network payload by using delta compression between messages
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeltaMessageBatchDTO {
    private List<DeltaMessageDTO> messages;
    private Long roomId;
    private Boolean hasMore;
    private Long lastMessageId;
    private Integer totalMessages;
    private Long baseTimestamp; // Base timestamp for first message in milliseconds
}