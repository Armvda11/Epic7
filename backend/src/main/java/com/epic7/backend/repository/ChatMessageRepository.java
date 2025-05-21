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
     * Finds messages by chat room ID.
     * 
     * @param roomId the ID of the chat room
     * @return a list of messages for the specified chat room
     */
    List<ChatMessage> findByChatRoomId(Long roomId);

    /**
     * Finds the specified number of most recent messages by chat room ID,
     * ordered from oldest to most recent.
     * 
     * @param roomId the ID of the chat room
     * @param number the number of messages to retrieve
     * @return a list containing the specified number of messages for the chat room, from oldest to most recent
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatRoom.id = :roomId ORDER BY cm.timestamp ASC")
    List<ChatMessage> findLastMessagesByChatRoomId(@Param("roomId") Long roomId, Pageable pageable);
}