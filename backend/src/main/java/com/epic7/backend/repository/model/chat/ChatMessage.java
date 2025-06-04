package com.epic7.backend.repository.model.chat;

import java.time.Instant;

import com.epic7.backend.repository.model.User;

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
    @JoinColumn(name = "sender", nullable = false)
    private User sender;

    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private Instant timestamp;

}
