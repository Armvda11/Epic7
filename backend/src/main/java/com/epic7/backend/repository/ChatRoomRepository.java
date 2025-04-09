package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.epic7.backend.model.chat.ChatRoom;
import com.epic7.backend.model.enums.ChatType;

import java.util.List;
import java.util.Optional;

/**
 * Interface de gestion des messages de chat dans la base de données.
 * 
 * Cette interface étend JpaRepository pour fournir des opérations CRUD sur les messages de chat.
 * 
 * @see ChatRoom
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    
    /**
     * Find all chat rooms where a user is a member (connected)
     */
    @Query("SELECT c FROM ChatRoom c WHERE :userId MEMBER OF c.userIds")
    List<ChatRoom> findByUserIdsContaining(@Param("userId") Long userId);
    
    /**
     * Find chat room by type and group ID
     */
    ChatRoom findByTypeAndGroupId(ChatType type, Long groupId);
    
    /**
     * Find all chat rooms by type
     */
    List<ChatRoom> findByType(ChatType type);
    
    /**
     * Find all guild chat rooms for specific guilds
     */
    @Query("SELECT c FROM ChatRoom c WHERE c.type = :type AND c.groupId IN :groupIds")
    List<ChatRoom> findByTypeAndGroupIdIn(@Param("type") ChatType type, @Param("groupIds") List<Long> groupIds);
    
    /**
     * Find a chat room by name
     */
    Optional<ChatRoom> findByName(String name);
    
    /**
     * Check if a chat room exists for a specific group
     */
    boolean existsByTypeAndGroupId(ChatType type, Long groupId);
    
    /**
     * Verify if a user is an admin of a chat room
     * @param chatRoomId The ID of the chat room
     * @param userId The ID of the user
     * @return true if the user is an admin of the chat room, false otherwise
     */
    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM ChatRoom c WHERE c.id = :chatRoomId AND :userId MEMBER OF c.adminUserIds")
    boolean isUserAdminOfChatRoom(@Param("chatRoomId") Long chatRoomId, @Param("userId") Long userId);
    
    /**
     * Find all chat rooms where a user is an admin
     */
    @Query("SELECT c FROM ChatRoom c WHERE :userId MEMBER OF c.adminUserIds")
    List<ChatRoom> findByAdminUserIdsContaining(@Param("userId") Long userId);
    
    /**
     * Find all administrators of a chat room
     */
    @Query("SELECT c.adminUserIds FROM ChatRoom c WHERE c.id = :chatRoomId")
    List<Long> findAdminsByRoomId(@Param("chatRoomId") Long chatRoomId);
    
    /**
     * Count users connected to a specific chat room
     */
    @Query("SELECT SIZE(c.userIds) FROM ChatRoom c WHERE c.id = :chatRoomId")
    int countConnectedUsers(@Param("chatRoomId") Long chatRoomId);
}
