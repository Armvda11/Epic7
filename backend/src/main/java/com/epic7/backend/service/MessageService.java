package com.epic7.backend.service;

import org.springframework.stereotype.Service;

import com.epic7.backend.repository.*;
import com.epic7.backend.repository.model.*;

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
    // -------------------------------------------------

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
    public Message sendMessage(String userName, User recipient, String subject, String messageContent, Instant validUntil) {

        // Créer le message
        Message message = new Message();
        message.setSender(userName); // Utilisation du username au lieu de l'objet User
        message.setRecipient(recipient);
        message.setSubject(subject);
        message.setMessage(messageContent);
        message.setCreatedAt(Instant.now());
        message.setValidUntil(validUntil != null ? validUntil : Instant.now().plus(30, ChronoUnit.DAYS));
        message.setRead(false);

        // Enregistrer le message dans la base de données
        return messageRepository.save(message);
    }

    @Transactional
    public Message sendUserMessage(User sender, User recipient, String subject, String messageContent, Instant validUntil) {
        // Vérifier si les utilisateurs existent
        Optional<User> optionalSender = userRepository.findById(sender.getId());
        Optional<User> optionalRecipient = userRepository.findById(recipient.getId());
        
        if (optionalSender.isEmpty()) {
            throw new IllegalArgumentException("L'expéditeur n'existe pas.");
        }
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }
        Message message = sendMessage(optionalSender.get().getUsername(), optionalRecipient.get(), subject, messageContent, validUntil);
        // Enregistrer le message dans la base de données
        return messageRepository.save(message);
    }

    @Transactional
    public Message sendMessage(User sender, User recipient, String subject, String messageContent) {
        return sendUserMessage(sender, recipient, subject, messageContent, null);
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
            message.setSender(optionalSender.get().getUsername()); // Utilisation du username
            message.setRecipient(recipient);
            message.setSubject(subject);
            message.setMessage(messageContent);
            message.setCreatedAt(now);
            message.setValidUntil(messageValidUntil);
            message.setRead(false);
            
            messageRepository.save(message);
        }
    }

    @Transactional
    public void sendFriendRequest(User sender, Long userId) {
        // Vérifier si l'utilisateur existe
        Optional<User> optionalRecipient = userRepository.findById(userId);
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }

        // Créer le message
        Message message = new Message();
        message.setSender(sender.getUsername()); // Utilisation du username
        message.setRecipient(optionalRecipient.get());
        message.setSubject("Demande d'ami");
        message.setMessage("Vous avez reçu une demande d'ami de " + sender.getUsername());
        message.setCreatedAt(Instant.now());
        message.setValidUntil(Instant.now().plus(30, ChronoUnit.DAYS));
        message.setContainItems(false);
        message.setRead(false);
        message.setFriendRequest(true);

        // Enregistrer le message dans la base de données
        messageRepository.save(message);
    }

    //-------------------------------------------------
    // Partie de réception de message
    // -------------------------------------------------

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
     * Récupère un message par son ID.
     *
     * @param messageId L'identifiant du message à récupérer.
     * @param user      L'utilisateur qui demande le message.
     * @return Le message correspondant à l'ID donné.
     */
    @Transactional(readOnly = true)
    public Message getMessageById(Long messageId, User user) {
        // Vérifier si le message appartient à l'utilisateur
        Message message = messageRepository.findByIdAndRecipientId(messageId, user.getId());
        if (message == null) {
            throw new IllegalArgumentException("Message introuvable ou accès non autorisé");
        }
        return message;
    }

    /**
     * Récupère tous les messages envoyés par un utilisateur.
     *
     * @param user L'utilisateur dont on veut récupérer les messages envoyés.
     * @return La liste des messages envoyés par l'utilisateur.
     */
    @Transactional(readOnly = true)
    public List<Message> getSentMessages(User user) {
        return messageRepository.findBySender(user.getUsername());
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
    // -------------------------------------------------

    @Transactional
    public void markMessageAsRead(Message message) {
        message.setRead(true);
        messageRepository.save(message);
    }

    @Transactional
    public boolean markMessageAsRead(Long messageId, Long userId) {
        Message message = messageRepository.findByIdAndRecipientId(messageId, userId);
        if (message == null) {
            return false; // Message introuvable ou accès non autorisé
        }
        message.setRead(true);
        messageRepository.save(message);
        return true;
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
    public void retrieveItemsFromMessage(Long messageId, Long userId) {
        
        // vérifier si le message existe
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message introuvable"));
        // vérifier si le message appartient à l'utilisateur
        if (!message.getRecipient().getId().equals(userId)) {
            throw new IllegalArgumentException("Le message ne vous appartient pas");
        }
        
        // Vérifier si le message contient des objets cibles
        if (message.getTargetShopItemsId() == null || message.getTargetShopItemsId().isEmpty()) {
            throw new IllegalArgumentException("Aucun objet cible dans le message");
        }
        
        for (Long itemId : message.getTargetShopItemsId()) {
            if (itemId == null) {
                continue; // Skip null IDs to prevent exceptions
            }
            
            try {
                ShopItem item = shopItemRepo.findById(itemId)
                    .orElseThrow(() -> new IllegalArgumentException("Objet introuvable avec ID: " + itemId));

                switch (item.getType()) {
                case HERO -> {
                    if (item.getTargetItemId() == null) {
                        throw new IllegalArgumentException("ID de héros manquant pour l'objet: " + itemId);
                    }
                    
                    Hero hero = heroRepo.findById(item.getTargetItemId())
                        .orElseThrow(() -> new IllegalArgumentException("Héros introuvable avec ID: " + item.getTargetItemId()));
                    
                    // Enregistrer le héros possédé par l'utilisateur
                    User player = message.getRecipient();

                    // Ajouter le héros à la liste des héros possédés par l'utilisateur
                    player.addHeros(hero, item.getQuantityPerPurchase());
                }
                case EQUIPMENT -> {
                    if (item.getTargetItemId() == null) {
                        throw new IllegalArgumentException("ID d'équipement manquant pour l'objet: " + itemId);
                    }
                    
                    Equipment equipment = equipmentRepo.findById(item.getTargetItemId())
                        .orElseThrow(() -> new IllegalArgumentException("Équipement introuvable avec ID: " + item.getTargetItemId()));
                    
                    // Enregistrer l'équipement possédé par l'utilisateur
                    User player = message.getRecipient();
                    
                    // Ajouter l'équipement à la liste des équipements possédés par l'utilisateur
                    player.addEquipment(equipment, item.getQuantityPerPurchase());;
                }
                case GOLD -> {
                    // Ajouter l'or à l'utilisateur
                    message.getRecipient().setGold(message.getRecipient().getGold() + item.getPriceInGold());
                }
                case DIAMOND -> {
                    // Ajouter les diamants à l'utilisateur
                    message.getRecipient().setDiamonds(message.getRecipient().getDiamonds() + item.getPriceInDiamonds());
                }
                default -> throw new IllegalArgumentException("Type d'objet inconnu: " + item.getType());
                }
            } catch (IllegalArgumentException e) {
                // Log the error but continue processing other items
                System.err.println("Erreur lors du traitement de l'objet " + itemId + ": " + e.getMessage());
            }
        }
        
        // Update the message
        message.setContainItems(false);
        message.setTargetShopItemsId(List.of());
        message.setRead(true);

        // Modify the message to indicate that the items have been retrieved
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
    public boolean deleteMessage(Long messageId, Long userId) {
        Message message = messageRepository.findByIdAndRecipientId(messageId, userId);
        if (message == null) {
            return false; // Message introuvable ou accès non autorisé
        }
        if (message.isContainItems()) {
            // Si le message contient des objets, on ne peut pas le supprimer
            throw new IllegalArgumentException("Impossible de supprimer un message contenant des objets");
        }
        // Supprimer le message
        messageRepository.delete(message);
        return true;
    }

    @Transactional
    public void removeExpiredMessages() {
        Instant now = Instant.now();
        List<Message> expiredMessages = messageRepository.findByValidUntilBefore(now);
        for (Message message : expiredMessages) {
            messageRepository.delete(message);
        }
    }


    @Transactional
    public boolean sendShopItemsMessage(User recipient, List<Long> targetShopItemsId, Instant validUntil, User giftSender) {
        // Vérifier si l'utilisateur existe
        Optional<User> optionalRecipient = userRepository.findById(recipient.getId());
        
        if (optionalRecipient.isEmpty()) {
            throw new IllegalArgumentException("Le destinataire n'existe pas.");
        }

        User actualRecipient = optionalRecipient.get();
        String senderName;
        String subject;
        String messageContent;

        // Déterminer l'expéditeur du message
        if (giftSender == null) {
            // Utiliser un nom d'utilisateur système simple
            senderName = "System";

            subject = "BuyedItemSubject";
            messageContent = "Vous avez reçu votre achat !\n" +
                    "Vous pouvez le récupérer dans votre inventaire.";
        }
        else {
            // Id de l'admin
            if (giftSender.getId() == 1L) {
                // Utiliser un nom d'utilisateur pour l'équipe
                senderName = "Epic7Team";
    
                subject = "GiftItemSubject";
                messageContent = "Vous avez reçu un cadeau de la part de l'équipe Epic7 !\n" +
                        "Vous pouvez le récupérer ici.";
            }
            else {
                // Vérifier si l'expéditeur existe (utilisateur normal)
                Optional<User> optionalGiftSender = userRepository.findById(giftSender.getId());
                if (optionalGiftSender.isEmpty()) {
                    throw new IllegalArgumentException("L'expéditeur n'existe pas.");
                }
                senderName = optionalGiftSender.get().getUsername();
                
                subject = "GiftItemSubject";
                messageContent = "Vous avez reçu un cadeau de la part de " + senderName + " !\n" +
                        "Vous pouvez le récupérer ici.";
            }
        }

        // Vérifier si la liste des objets cibles est vide
        if (targetShopItemsId == null || targetShopItemsId.isEmpty()) {
            throw new IllegalArgumentException("La liste des objets cibles est vide.");
        }

        // Vérifier si les objets cibles existent
        for (Long itemId : targetShopItemsId) {
            Optional<ShopItem> optionalItem = shopItemRepo.findById(itemId);
            if (optionalItem.isEmpty()) {
                throw new IllegalArgumentException("L'objet cible avec l'ID " + itemId + " n'existe pas.");
            }
        }

        // Créer le message - Complètement configurer le message avant de le sauvegarder
        Message message = new Message();
        message.setSender(senderName); // Utiliser le nom au lieu de l'objet User
        message.setRecipient(actualRecipient);
        message.setSubject(subject);
        message.setMessage(messageContent);
        message.setCreatedAt(Instant.now());
        message.setValidUntil(validUntil != null ? validUntil : Instant.now().plus(30, ChronoUnit.DAYS));
        message.setRead(false);
        message.setTargetShopItemsId(targetShopItemsId != null ? targetShopItemsId : List.of());
        message.setContainItems(true);

        // Enregistrer le message dans la base de données
        messageRepository.save(message);

        return true;
    }

    public Long getSenderId(Message message) {
        // Vérifier si l'expéditeur est un utilisateur système
        if (message.isFromSystem()) {
            return 1L; // On renvoie l'Id de l'admin
        }
        
        // Récupérer l'utilisateur correspondant à l'expéditeur
        List<User> users = userRepository.findByUsernameLikeIgnoreCase(message.getSender());
        if (users.isEmpty()) {
            return null; // Aucun utilisateur trouvé
        }
        User sender = users.get(0);
        return sender.getId();
    }
}
