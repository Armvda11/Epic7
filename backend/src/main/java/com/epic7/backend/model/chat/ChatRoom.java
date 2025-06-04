package com.epic7.backend.model.chat;

import java.util.List;

import com.epic7.backend.model.enums.ChatType;

import jakarta.persistence.*;
import lombok.*;

/**
 * Représente une salle de chat dans le jeu.
 * Contient des informations sur le nom, le type de chat et les utilisateurs connectés.
 * @author corentin
 */

@Entity
@Table(name = "chat_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatType type; // GUILD, GLOBAL, FIGHT

    @Column(nullable = true)
    private Long groupId; // ID of the guild or the fight if applicable or null if global chat

    @ElementCollection
    @CollectionTable(name = "chat_room_users", joinColumns = @JoinColumn(name = "chat_room_id"))
    @Column(name = "user_id")
    private List<Long> userIds; // List of user IDs connected to this chat room

    @ElementCollection
    @CollectionTable(name = "chat_room_admin", joinColumns = @JoinColumn(name = "chat_room_id"))
    @Column(name = "admin_user_id")
    private List<Long> adminUserIds; // List of admin user IDs connected to this chat room
}
