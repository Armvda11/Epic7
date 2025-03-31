package com.epic7.backend.service;

import org.springframework.stereotype.Service;

import com.epic7.backend.model.*;
import com.epic7.backend.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.transaction.annotation.Transactional;
import java.util.List;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
/**
 * Service de gestion des messages.
 *
 * Ce service gère les opérations liées aux messages, y compris l'envoi et la récupération des messages.
 *
 * @author corentin
 */

@Service
@RequiredArgsConstructor
public class MessageService {
    
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ShopItemRepository shopItemRepo;
    private final HeroRepository heroRepo;
    private final EquipmentRepository equipmentRepo;

    //-------------------------------------------------
    // Partie d'envoie de message
    /**
     * Envoie un message à un utilisateur.
     *
     * @param sender          L'utilisateur qui envoie le message.
     * @param recipient       L'utilisateur à qui le message est envoyé.
     * @param subject         Le sujet du message.
     * @param messageContent  Le contenu du message.
     * @param validUntil      La date de validité du message.
     * @return Le message envoyé.
     */
    @Transactional
    public Message sendMessage(User sender, User recipient, String subject, String messageContent, Instant validUntil) {
        // Vérifier si les utilisateurs existent
        Optional<User> optionalSender = userRepository.findById(sender.getId());
        Optional<User> optionalRecipient = userRepository.findById(recipient.getId());
        
        if (optionalSender.isEmpty()) {
            throw new IllegalArgumentException("L'expéditeur n'existe pas.");
        }
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }

        // Créer le message
        Message message = new Message();
        message.setSender(optionalSender.get());
        message.setRecipient(optionalRecipient.get());
        message.setSubject(subject);
        message.setMessage(messageContent);
        message.setCreatedAt(Instant.now());
        message.setValidUntil(validUntil != null ? validUntil : Instant.now().plus(30, ChronoUnit.DAYS));
        message.setRead(false);

        // Enregistrer le message dans la base de données
        return messageRepository.save(message);
    }

    @Transactional
    public Message sendMessage(User sender, User recipient, String subject, String messageContent) {
        return sendMessage(sender, recipient, subject, messageContent, null);
    }

    @Transactional
    public Message sendMessage(User sender, Long recipient_id, String subject, String messageContent) {
        // Vérifier si l'utilisateur existe
        Optional<User> optionalRecipient = userRepository.findById(recipient_id);
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }

        return sendMessage(sender, optionalRecipient.get(), subject, messageContent);
    }

    /**
     * Envoie un message à tous les utilisateurs.
     *
     * @param sender          L'utilisateur qui envoie le message.
     * @param subject         Le sujet du message.
     * @param messageContent  Le contenu du message.
     * @param validUntil      La date de validité du message.
     */
    @Transactional
    public void sendMessageToAll(User sender, String subject, String messageContent, Instant validUntil) {
        // Vérifier si l'expéditeur existe
        Optional<User> optionalSender = userRepository.findById(sender.getId());
        if (optionalSender.isEmpty()) {
            throw new IllegalArgumentException("L'expéditeur n'existe pas.");
        }

        // Récupérer tous les utilisateurs
        List<User> recipients = userRepository.findAll();
        
        Instant now = Instant.now();
        Instant messageValidUntil = validUntil != null ? validUntil : now.plus(30, ChronoUnit.DAYS);

        // Envoyer le message à chaque utilisateur
        for (User recipient : recipients) {
            Message message = new Message();
            message.setSender(optionalSender.get());
            message.setRecipient(recipient);
            message.setSubject(subject);
            message.setMessage(messageContent);
            message.setCreatedAt(now);
            message.setValidUntil(messageValidUntil);
            message.setRead(false);
            
            messageRepository.save(message);
        }
    }

    /**
     * Envoie un message à un utilisateur avec des objets cibles.
     * Uniquement utilisé par le système du shop ou par l'admin
     *
     * @param sender           L'utilisateur qui envoie le message.
     * @param recipient        L'utilisateur à qui le message est envoyé.
     * @param subject          Le sujet du message.
     * @param messageContent   Le contenu du message.
     * @param targetShopItemsId La liste des ID des objets cibles.
     * @param validUntil       La date de validité du message.
     */
    @Transactional
    public void sendItemMessage(User sender, User recipient, String subject, String messageContent, 
                                List<Long> targetShopItemsId, Instant validUntil) {

        // Vérifier si l'utilisateur existe
        Optional<User> optionalRecipient = userRepository.findById(recipient.getId());
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }

        // Créer le message
        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(optionalRecipient.get());
        message.setSubject(subject);
        message.setMessage(messageContent);
        message.setCreatedAt(Instant.now());
        message.setValidUntil(validUntil != null ? validUntil : Instant.now().plus(30, ChronoUnit.DAYS));
        message.setRead(false);
        message.setTargetShopItemsId(targetShopItemsId);

        // Enregistrer le message dans la base de données
        messageRepository.save(message);
    }


    //-------------------------------------------------
    // Partie de réception de message

    /**
     * Récupère tous les messages d'un utilisateur.
     *
     * @param user L'utilisateur dont on veut récupérer les messages.
     * @return La liste des messages de l'utilisateur.
     */
    @Transactional(readOnly = true)
    public List<Message> getMessages(User user) {
        return messageRepository.findByRecipientId(user.getId());
    }
    /**
     * Récupère tous les messages envoyés par un utilisateur.
     *
     * @param user L'utilisateur dont on veut récupérer les messages envoyés.
     * @return La liste des messages envoyés par l'utilisateur.
     */
    @Transactional(readOnly = true)
    public List<Message> getSentMessages(User user) {
        return messageRepository.findBySenderId(user.getId());
    }

    /**
     * Récupère tous les messages non lus d'un utilisateur.
     *
     * @param user L'utilisateur dont on veut récupérer les messages non lus.
     * @return La liste des messages non lus de l'utilisateur.
     */
    @Transactional(readOnly = true)
    public List<Message> getUnreadMessages(User user) {
        return messageRepository.findByRecipientIdAndIsReadFalse(user.getId());
    }

    @Transactional
    public void markMessageAsRead(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message introuvable"));
        message.setRead(true);
        messageRepository.save(message);
    }


    // -------------------------------------------------
    // Partie d'intéraction Message-User
    @Transactional
    public void markMessageAsRead(Message message) {
        message.setRead(true);
        messageRepository.save(message);
    }

    @Transactional
    public void markAllMessagesAsRead(User user) {
        List<Message> messages = messageRepository.findByRecipientIdAndIsReadFalse(user.getId());
        for (Message message : messages) {
            message.setRead(true);
        }
        messageRepository.saveAll(messages);
    }

    @Transactional
    public void retrieveItemsFromMessage(Long messageId) {
        
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message introuvable"));
        // Vérifier si le message contient des objets cibles
        if (message.getTargetShopItemsId() == null || message.getTargetShopItemsId().isEmpty()) {
            throw new IllegalArgumentException("Aucun objet cible dans le message");
        }
        
        for (Long itemId : message.getTargetShopItemsId()) {
            ShopItem item = shopItemRepo.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Objet introuvable"));

            switch (item.getType()) {
            case HERO -> {
                Hero hero = heroRepo.findById(item.getTargetId())
                    .orElseThrow(() -> new IllegalArgumentException("Héros introuvable"));
                
                    // Enregistrer le héros possédé par l'utilisateur
                PlayerHero playerHero = new PlayerHero();
                User player = message.getRecipient();
                playerHero.setUser(player);
                playerHero.setHero(hero);

                // Ajouter le héros à la liste des héros possédés par l'utilisateur
                player.getOwnedHeroes().add(playerHero);

            }
            case EQUIPMENT -> {
                Equipment eq = equipmentRepo.findById(item.getTargetId())
                    .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable"));
                // Enregistrer l'équipement possédé par l'utilisateur

                PlayerEquipment playerEquipment = new PlayerEquipment();
                User player = message.getRecipient();
                playerEquipment.setUser(player);
                playerEquipment.setEquipment(eq);
                // Ajouter l'équipement à la liste des équipements possédés par l'utilisateur
                player.getEquipments().add(playerEquipment);
                
            }
            case GOLD -> {
                // Ajouter l'or à la liste des équipements possédés par l'utilisateur
                message.getRecipient().setGold(message.getRecipient().getGold() + item.getPriceInGold());
            }
            case DIAMOND -> {
                // Ajouter les diamants à la liste des équipements possédés par l'utilisateur
                message.getRecipient().setDiamonds(message.getRecipient().getDiamonds() + item.getPriceInDiamonds());
            }
            default -> throw new IllegalArgumentException("Type d'objet inconnu");
            }
        };
        // Supprimer les objets cibles du message
        message.setTargetShopItemsId(null);
        message.setRead(true);

        // On modifie le message pour dire que l'objet a été récupéré
        message.setMessage(message.getMessage() + "\n\n" +
                "Vous avez récupéré tous les objets cibles de ce message.\n" +
                "Vous pouvez les retrouver dans votre inventaire.");
        messageRepository.save(message);
    }
    
    //-------------------------------------------------
    // Partie de suppression de message

    /**
     * Supprime un message.
     *
     * @param messageId L'identifiant du message à supprimer.
     */
    @Transactional
    public void deleteMessage(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message introuvable"));
        messageRepository.delete(message);
    }

    @Transactional
    public void removeExpiredMessages() {
        Instant now = Instant.now();
        List<Message> expiredMessages = messageRepository.findByValidUntilBefore(now);
        for (Message message : expiredMessages) {
            messageRepository.delete(message);
        }
    }


}
