package com.epic7.backend.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.epic7.backend.model.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByRecipientId(Long recipientId);
    Message findByIdAndRecipientId(Long id, Long recipientId);
    List<Message> findBySender(String sender); // Changed from findBySenderId
    List<Message> findByRecipientIdAndIsReadFalse(Long recipientId);
    List<Message> findByValidUntilBefore(Instant dateTime);
}
