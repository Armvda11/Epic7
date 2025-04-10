package com.epic7.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.epic7.backend.model.User;
import com.epic7.backend.model.chat.ChatMessage;
import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.Guild;
import com.epic7.backend.model.enums.ChatType;
import com.epic7.backend.repository.ChatRepository;
import com.epic7.backend.repository.ChatRoomRepository;
import com.epic7.backend.repository.GuildRepository;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.model.enums.GuildRole;

import lombok.RequiredArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service de gestion des chats.
 *
 * Ce service gère les opérations liées aux chats, y compris la création de salons,
 * l'envoi et la récupération des messages de chat.
 */
@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatRepository chatRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final GuildRepository guildRepository;

    // ------------------ CHAT ROOM MANAGEMENT ------------------

    /**
     * Crée une salle de chat globale.
     *
     * @param name Le nom de la salle de chat.
     * @return La salle de chat créée.
     */
    @Transactional
    public ChatRoom createGlobalChatRoom(String name) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(name);
        chatRoom.setType(ChatType.GLOBAL);
        chatRoom.setGroupId(null);
        chatRoom.setUserIds(new ArrayList<>());
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Crée une salle de chat de guilde.
     *
     * @param guildId L'ID de la guilde.
     * @return La salle de chat créée.
     */
    @Transactional
    public ChatRoom createGuildChatRoom(Long guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));
        
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName(guild.getName() + " Chat");
        chatRoom.setType(ChatType.GUILD);
        chatRoom.setGroupId(guildId);
        
        // Initialize with guild members
        List<Long> memberIds = guild.getMembers().stream()
                .map(member -> member.getUser().getId())
                .collect(Collectors.toList());
        chatRoom.setUserIds(memberIds);
        
        // Initialize with guild leader as admin
        List<Long> adminIds = new ArrayList<>();
        if (guild.getLeader() != null) {
            adminIds.add(guild.getLeader());
        } else {
            throw new IllegalArgumentException("Guild has no leader");
        }
        chatRoom.setAdminUserIds(adminIds);
        
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Crée une salle de chat de combat.
     *
     * @param fightId L'ID du combat.
     * @param participants Les utilisateurs participant au combat.
     * @return La salle de chat créée.
     */
    @Transactional
    public ChatRoom createFightChatRoom(Long fightId, List<User> participants) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setName("Fight #" + fightId);
        chatRoom.setType(ChatType.FIGHT);
        chatRoom.setGroupId(fightId);
        
        List<Long> participantIds = participants.stream()
                .map(User::getId)
                .collect(Collectors.toList());
        chatRoom.setUserIds(participantIds);
        
        return chatRoomRepository.save(chatRoom);
    }

    /**
     * Récupère une salle de chat par son ID.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @return La salle de chat.
     */
    @Transactional(readOnly = true)
    public ChatRoom getChatRoomById(Long chatRoomId) {
        return chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new IllegalArgumentException("Chat room not found"));
    }

    /**
     * Ajoute un utilisateur à une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     * @return True si l'ajout a réussi, False sinon.
     */
    @Transactional
    public boolean addUserToChatRoom(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Check if user is allowed to join
        if (chatRoom.getType() == ChatType.GUILD) {
            Guild guild = guildRepository.findById(chatRoom.getGroupId())
                    .orElseThrow(() -> new IllegalArgumentException("Guild not found"));
            
            boolean isMember = guild.getMembers().stream()
                    .anyMatch(member -> member.getUser().getId().equals(userId));
            
            if (!isMember) {
                return false; // User is not a member of the guild
            }
        }
        
        List<Long> userIds = chatRoom.getUserIds();
        if (!userIds.contains(userId)) {
            userIds.add(userId);
            chatRoom.setUserIds(userIds);
            chatRoomRepository.save(chatRoom);
        }
        
        return true;
    }

    /**
     * Retire un utilisateur d'une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     */
    @Transactional
    public void removeUserFromChatRoom(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        List<Long> userIds = chatRoom.getUserIds();
        userIds.remove(userId);
        chatRoom.setUserIds(userIds);
        chatRoomRepository.save(chatRoom);
    }

    // ------------------ ADMIN MANAGEMENT ------------------

    /**
     * Vérifie si un utilisateur est administrateur d'une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     * @return True si l'utilisateur est administrateur, False sinon.
     */
    @Transactional(readOnly = true)
    public boolean isUserAdmin(Long chatRoomId, Long userId) {
        return chatRoomRepository.isUserAdminOfChatRoom(chatRoomId, userId);
    }

    /**
     * Ajoute un utilisateur comme administrateur d'une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     * @param requestingUserId L'ID de l'utilisateur faisant la demande.
     * @return True si l'ajout a réussi, False sinon.
     */
    @Transactional
    public boolean addUserAsAdmin(Long chatRoomId, Long userId, Long requestingUserId) {
        // Check if requesting user is admin
        if (!isUserAdmin(chatRoomId, requestingUserId)) {
            return false; // Requesting user is not admin
        }
        
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        // Vérifier si l'utilisateur a accès au chat
        if (!canUserAccessChat(userId, chatRoom)) {
            return false; // L'utilisateur n'a pas accès à ce chat
        }

        // Check if user is already an admin
        if (chatRoom.getAdminUserIds() == null) {
            chatRoom.setAdminUserIds(new ArrayList<>());
        }
        
        List<Long> adminUserIds = chatRoom.getAdminUserIds();
        if (!adminUserIds.contains(userId)) {
            adminUserIds.add(userId);
            chatRoom.setAdminUserIds(adminUserIds);
            chatRoomRepository.save(chatRoom);
        }
        
        return true;
    }

    /**
     * Retire les privilèges d'administrateur à un utilisateur.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     * @param requestingUserId L'ID de l'utilisateur faisant la demande.
     * @return True si le retrait a réussi, False sinon.
     */
    @Transactional
    public boolean removeUserAsAdmin(Long chatRoomId, Long userId, Long requestingUserId) {
        // Check if requesting user is admin
        if (!isUserAdmin(chatRoomId, requestingUserId)) {
            return false; // Requesting user is not admin
        }
        
        // Prevent removing yourself as admin
        if (userId.equals(requestingUserId)) {
            return false; // Cannot remove yourself as admin
        }
        
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        if (chatRoom.getAdminUserIds() == null) {
            return false; // No admins to remove
        }
        
        List<Long> adminUserIds = chatRoom.getAdminUserIds();
        boolean removed = adminUserIds.remove(userId);
        
        if (removed) {
            chatRoom.setAdminUserIds(adminUserIds);
            chatRoomRepository.save(chatRoom);
            return true;
        }
        
        return false; // User was not an admin
    }

    /**
     * Met à jour les administrateurs d'une salle de chat de guilde en fonction des rôles des membres.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param minRole Le rôle minimum requis pour être administrateur.
     * @return True si la mise à jour a réussi, False sinon.
     */
    @Transactional
    public boolean majGuildChatAdmins(Long chatRoomId, GuildRole minRole) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        // Cette fonction ne fonctionne que pour les salles de chat de guilde
        if (chatRoom.getType() != ChatType.GUILD) {
            return false;
        }
        
        Long guildId = chatRoom.getGroupId();
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));
        
        // Mettre à jour le rôle minimum pour être admin dans cette guilde
        guild.setChatAdminRole(minRole);
        guildRepository.save(guild);
        
        // Obtenir tous les membres avec le rôle spécifié ou supérieur
        List<Long> adminUserIds = guild.getMembers().stream()
                .filter(member -> member.getRole().ordinal() >= minRole.ordinal())
                .map(member -> member.getUser().getId())
                .collect(Collectors.toList());
        
        // S'assurer que le leader de la guilde est administrateur
        if (guild.getLeader() != null && !adminUserIds.contains(guild.getLeader())) {
            adminUserIds.add(guild.getLeader());
        }
        
        chatRoom.setAdminUserIds(adminUserIds);
        chatRoomRepository.save(chatRoom);
        
        return true;
    }

    
    /**
     * Synchronise les admins du chat de guilde avec les rôles actuels des membres.
     * À appeler après des changements de rôles multiples ou une réorganisation de la guilde.
     *
     * @param guildId L'ID de la guilde.
     * @return True si la synchronisation a réussi, False sinon.
     */
    @Transactional
    public boolean syncGuildChatAdmins(Long guildId) {
        // Trouver la guilde
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guild not found"));
        
        // Trouver la salle de chat de la guilde
        ChatRoom chatRoom = chatRoomRepository.findByTypeAndGroupId(ChatType.GUILD, guildId);
        if (chatRoom == null) {
            throw new IllegalArgumentException("Chat room not found for this guild");
        }
        
        // Utiliser le rôle minimum configuré pour cette guilde
        GuildRole minAdminRole = guild.getChatAdminRole();
        
        // Mettre à jour tous les administrateurs
        return majGuildChatAdmins(chatRoom.getId(), minAdminRole);
    }
    
    /**
     * Récupère le rôle minimum pour être admin dans une guilde.
     * Cette méthode pourrait être implémentée différemment selon votre modèle de données.
     * 
     * @param guild La guilde.
     * @return Le rôle minimum pour être admin.
     */
    public GuildRole getMinAdminRoleForGuild(Guild guild) {
        // Si la guilde a un attribut minAdminRole, vous pourriez le récupérer ici
        return guild.getChatAdminRole();
    }

    // ------------------ MESSAGE MANAGEMENT ------------------

    /**
     * Envoie un message dans une salle de chat.
     *
     * @param sender L'utilisateur qui envoie le message.
     * @param chatRoomId L'ID de la salle de chat.
     * @param content Le contenu du message.
     * @return Le message envoyé.
     */
    @Transactional
    public ChatMessage sendMessage(User sender, Long chatRoomId, String content) {
        Optional<User> optionalSender = userRepository.findById(sender.getId());
        if (optionalSender.isEmpty()) {
            throw new IllegalArgumentException("L'expéditeur n'existe pas.");
        }
        
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        // Vérifier si l'utilisateur a accès à cette salle de chat
        if (!canUserAccessChat(sender.getId(), chatRoom)) {
            throw new IllegalArgumentException("L'utilisateur n'a pas accès à cette salle de chat.");
        }
        
        // Vérifier si l'utilisateur est connecté à la salle de chat
        if (!chatRoom.getUserIds().contains(sender.getId())) {
            throw new IllegalArgumentException("L'utilisateur n'est pas connecté à cette salle de chat.");
        }
        
        ChatMessage message = new ChatMessage();
        message.setChatRoom(chatRoom);
        message.setSender(optionalSender.get());
        message.setContent(content);
        message.setTimestamp(Instant.now());
        
        return chatRepository.save(message);
    }

    /**
     * Vérifie si un utilisateur a accès à une salle de chat.
     *
     * @param userId L'ID de l'utilisateur.
     * @param chatRoom La salle de chat.
     * @return True si l'utilisateur a accès, False sinon.
     */
    private boolean canUserAccessChat(Long userId, ChatRoom chatRoom) {
        if (chatRoom.getType() == ChatType.GLOBAL) {
            return true; // Tout le monde a accès au chat global
        } else if (chatRoom.getType() == ChatType.GUILD) {
            // Vérifier si l'utilisateur est membre de la guilde
            Guild guild = guildRepository.findById(chatRoom.getGroupId())
                    .orElseThrow(() -> new IllegalArgumentException("Guild not found"));
            
            return guild.getMembers().stream()
                    .anyMatch(member -> member.getUser().getId().equals(userId));
        } else if (chatRoom.getType() == ChatType.FIGHT) {
            // Pour un chat de combat, l'accès est limité aux participants du combat
            // Seuls les participants sont dans la room
            return chatRoom.getUserIds().contains(userId);
        }
        
        return false;
    }

    /**
     * Récupère tous les messages d'une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @return La liste des messages de la salle de chat.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getChatRoomMessages(Long chatRoomId) {
        // Vérifier si la salle de chat existe
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        if (chatRoom == null) {
            throw new IllegalArgumentException("Chat room not found");
        }
        // Find all messages for this chat room (this would require a new method in the ChatRepository)
        return chatRepository.findByChatRoomId(chatRoomId);
    }

    /**
     * Récupère les salles de chat auxquelles un utilisateur est connecté.
     *
     * @param userId L'ID de l'utilisateur.
     * @return La liste des salles de chat.
     */
    @Transactional(readOnly = true)
    public List<ChatRoom> getUserChatRooms(Long userId) {
        // Find all chat rooms where the user is a member
        // This would require a new method in the ChatRoomRepository
        return chatRoomRepository.findByUserIdsContaining(userId);
    }

    /**
     * Récupère les messages récents d'une salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param limit Le nombre maximum de messages à récupérer.
     * @return La liste des messages récents.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getRecentMessages(Long chatRoomId, int limit) {
        // Get recent messages for a chat room, ordered by timestamp
        // This would require a new method in the ChatRepository
        return chatRepository.findTopByChatRoomIdOrderByTimestampDesc(chatRoomId, limit);
    }

    /**
     * Supprime un message de chat.
     *
     * @param messageId L'ID du message.
     * @param requestingUserId L'ID de l'utilisateur qui demande la suppression.
     * @return True si la suppression a réussi, False sinon.
     */
    @Transactional
    public boolean deleteMessage(Long messageId, Long requestingUserId) {
        ChatMessage message = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        
        // The sender or an admin can delete a message
        if (message.getSender().getId().equals(requestingUserId) ||
                isUserAdmin(message.getChatRoom().getId(), requestingUserId)) {
            chatRepository.delete(message);
            return true;
        }
        return false;
    }

    /**
     * Connecte un utilisateur à une salle de chat.
     * Cela ajoute l'utilisateur à la liste des utilisateurs connectés.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     * @return True si la connexion a réussi, False sinon.
     */
    @Transactional
    public boolean connectUserToChatRoom(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Vérifier si l'utilisateur a accès au chat
        if (!canUserAccessChat(userId, chatRoom)) {
            return false; // L'utilisateur n'a pas accès à ce chat
        }
        
        // Ajouter l'utilisateur à la liste des utilisateurs connectés s'il n'y est pas déjà
        List<Long> userIds = chatRoom.getUserIds();
        if (!userIds.contains(userId)) {
            userIds.add(userId);
            chatRoom.setUserIds(userIds);
            chatRoomRepository.save(chatRoom);
        }
        return true;
    }

    /**
     * Déconnecte un utilisateur d'une salle de chat.
     * Cela retire l'utilisateur de la liste des utilisateurs connectés.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur.
     */
    @Transactional
    public void disconnectUserFromChatRoom(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        List<Long> userIds = chatRoom.getUserIds();
        userIds.remove(userId);
        chatRoom.setUserIds(userIds);
        chatRoomRepository.save(chatRoom);
    }

    /**
     * Récupère les messages d'une salle de chat.
     * L'utilisateur doit avoir accès à la salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur qui demande les messages.
     * @return La liste des messages de la salle de chat.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getChatRoomMessages(Long chatRoomId, Long userId) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        // Vérifier si l'utilisateur a accès à cette salle de chat
        if (!canUserAccessChat(userId, chatRoom)) {
            throw new IllegalArgumentException("L'utilisateur n'a pas accès à cette salle de chat.");
        }
        
        return chatRepository.findByChatRoomId(chatRoomId);
    }

    /**
     * Récupère les messages récents d'une salle de chat.
     * L'utilisateur doit avoir accès à la salle de chat.
     *
     * @param chatRoomId L'ID de la salle de chat.
     * @param userId L'ID de l'utilisateur qui demande les messages.
     * @param limit Le nombre maximum de messages à récupérer.
     * @return La liste des messages récents.
     */
    @Transactional(readOnly = true)
    public List<ChatMessage> getRecentMessages(Long chatRoomId, Long userId, int limit) {
        ChatRoom chatRoom = getChatRoomById(chatRoomId);
        
        // Vérifier si l'utilisateur a accès à cette salle de chat
        if (!canUserAccessChat(userId, chatRoom)) {
            throw new IllegalArgumentException("L'utilisateur n'a pas accès à cette salle de chat.");
        }
        
        return chatRepository.findTopByChatRoomIdOrderByTimestampDesc(chatRoomId, limit);
    }
}
