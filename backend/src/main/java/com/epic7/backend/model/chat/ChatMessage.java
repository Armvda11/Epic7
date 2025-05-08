package com.epic7.backend.model.chat;

import java.time.Instant;

import com.epic7.backend.model.User;

import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "chat_messages")
/**
 * Représente un message de chat dans le jeu.
 * Contient des informations sur l'expéditeur, le contenu et le timestamp du message.
 * @author corentin
 */

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "chat_room", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User sender;

    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private Instant timestamp;

    /**
     * Get the chat room this message belongs to
     * @return The chat room
     */
    public ChatRoom getRoom() {
        return this.chatRoom;
    }
}
