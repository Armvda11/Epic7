package com.epic7.backend.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.epic7.backend.model.chat.ChatMessage;

import java.time.Instant;
import java.util.List;

/**
 * Interface de gestion des messages de chat dans la base de données.
 * 
 * Cette interface étend JpaRepository pour fournir des opérations CRUD sur les messages de chat.
 * 
 * @see ChatMessage
 */
public interface ChatRepository extends JpaRepository<ChatMessage, Long> {
    
    /**
     * Find all messages for a specific chat room
     */
    List<ChatMessage> findByChatRoomId(Long chatRoomId);
    
    /**
     * Find messages by chat room, ordered by timestamp
     */
    List<ChatMessage> findByChatRoomIdOrderByTimestampDesc(Long chatRoomId);
    
    /**
     * Find messages by chat room and sender
     */
    List<ChatMessage> findByChatRoomIdAndSenderId(Long chatRoomId, Long senderId);
    
    /**
     * Find messages after a specific timestamp
     */
    List<ChatMessage> findByChatRoomIdAndTimestampAfter(Long chatRoomId, Instant timestamp);
    
    /**
     * Find recent messages for a chat room ordered by timestamp
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatRoom.id = ?1 ORDER BY m.timestamp DESC")
    List<ChatMessage> findTopByChatRoomIdOrderByTimestampDesc(Long chatRoomId, Pageable pageable);
    
    /**
     * Overloaded method with limit parameter
     */
    default List<ChatMessage> findTopByChatRoomIdOrderByTimestampDesc(Long chatRoomId, int limit) {
        return findTopByChatRoomIdOrderByTimestampDesc(chatRoomId, 
                org.springframework.data.domain.PageRequest.of(0, limit));
    }
    
    /**
     * Delete all messages from a specific chat room
     */
    void deleteByChatRoomId(Long chatRoomId);
    
    /**
     * Count messages in a chat room
     */
    long countByChatRoomId(Long chatRoomId);
}
