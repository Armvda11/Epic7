package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.epic7.backend.model.Message;

import java.time.Instant;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    
    // Trouver tous les messages reçus par un utilisateur spécifique
    List<Message> findByRecipientId(Long recipientId);
    
    // Trouver tous les messages envoyés par un utilisateur spécifique
    List<Message> findBySenderId(Long senderId);
    
    // Trouver tous les messages non lus pour un utilisateur spécifique
    List<Message> findByRecipientIdAndIsReadFalse(Long recipientId);
    
    // Trouver tous les messages valides pour un utilisateur
    List<Message> findByRecipientIdAndValidUntilAfter(Long recipientId, Instant now);
    
    // Trouver tous les messages expirés
    List<Message> findByValidUntilBefore(Instant now);
    
    // Compter le nombre de messages non lus pour un utilisateur
    long countByRecipientIdAndIsReadFalse(Long recipientId);
    
    // Chercher des messages par sujet (recherche partielle)
    List<Message> findByRecipientIdAndSubjectContainingIgnoreCase(Long recipientId, String subject);
    
    // Trouver les messages contenant un item spécifique dans la liste targetShopItemsId
    @Query(value = "SELECT * FROM messages m WHERE m.recipient_id = :recipientId AND :shopItemId = ANY (m.target_shop_items_id)", nativeQuery = true)
    List<Message> findByRecipientIdAndTargetShopItemId(@Param("recipientId") Long recipientId, @Param("shopItemId") Long shopItemId);
    
    // Supprimer tous les messages expirés
    void deleteByValidUntilBefore(Instant now);
}
