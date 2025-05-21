package com.epic7.backend.event;

import com.epic7.backend.model.chat.ChatMessage;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event that is fired when a chat message is sent
 */
@Getter
public class ChatMessageEvent extends ApplicationEvent {
    private final Long roomId;
    private final ChatMessage message;

    public ChatMessageEvent(Long roomId, ChatMessage message) {
        super(message);
        this.roomId = roomId;
        this.message = message;
    }
}