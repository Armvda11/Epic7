package com.epic7.backend.event;

import com.epic7.backend.model.chat.ChatMessage;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event that is published when a new chat message is created.
 * This helps decouple the ChatService from the WebSocket handler.
 */
@Getter
public class ChatMessageEvent extends ApplicationEvent {
    private final Long roomId;
    private final ChatMessage message;

    public ChatMessageEvent(Object source, Long roomId, ChatMessage message) {
        super(source);
        this.roomId = roomId;
        this.message = message;
    }
}