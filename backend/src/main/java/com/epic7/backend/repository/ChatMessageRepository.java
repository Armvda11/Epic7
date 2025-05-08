package com.epic7.backend.repository;

import com.epic7.backend.model.chat.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for managing ChatMessage entities.
 * Provides methods to save, find, and delete chat messages.
 * 
 * @author corentin
 */
@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    /**
     * Finds messages by chat room ID and orders them by timestamp in descending order.
     * 
     * @param roomId the ID of the chat room
     * @param pageable the pagination information
     * @return a list of messages for the specified chat room
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId ORDER BY cm.timestamp DESC")
    List<ChatMessage> findByChatRoomIdOrderByTimestampDesc(@Param("roomId") Long roomId, Pageable pageable);

    /**
     * Finds messages by chat room ID.
     * 
     * @param roomId the ID of the chat room
     * @return a list of messages for the specified chat room
     */
    List<ChatMessage> findByChatRoomId(Long roomId);
}