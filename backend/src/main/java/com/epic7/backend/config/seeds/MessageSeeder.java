package com.epic7.backend.config.seeds;

import com.epic7.backend.model.Message;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.MessageRepository;
import com.epic7.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import com.epic7.backend.service.MessageService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Seeder responsable de l'ajout de messages initiaux entre les utilisateurs.
 */
@Component
@RequiredArgsConstructor
public class MessageSeeder {

    private final UserRepository userRepo;
    private final MessageRepository messageRepo;
    private final MessageService messageService;



    public void seedMessages() {
        if (messageRepo.count() == 0) {
            List<User> users = userRepo.findAll();
            
            if (users.size() >= 2) {
                User sender = users.get(0);

                for (User user : users) {
                    Message message = new Message();
                    message.setSender(sender.getUsername());
                    message.setRecipient(user);
                    message.setSubject("Bienvenue dans le jeu !");
                    message.setMessage("Salut " + user.getUsername() + ", bienvenue sur Epic7 !");
                    message.setCreatedAt(Instant.now());
                    message.setValidUntil(Instant.now().plusSeconds(7 * 24 * 60 * 60)); // 7 jours de validité
                    messageRepo.save(message);

                    // Test de FriendRequest
                    messageService.sendFriendRequest(sender, user.getId());

                    // Test d'envoi de plusieurs shopping item
                    try {
                        // Vérifiez d'abord si les items existent
                        List<Long> itemIds = List.of(1L, 2L, 3L, 4L); // Ajout de l'ID 4 qui est également créé dans ShopSeeder
                        messageService.sendShopItemsMessage(user, itemIds, Instant.now().plus(7, ChronoUnit.DAYS), sender);
                    } catch (Exception e) {
                        System.out.println("❌ Erreur lors de l'envoi des articles de boutique: " + e.getMessage());
                    }
                }

                System.out.println("✅ Messages de bienvenue envoyés.");
            } else {
                System.out.println("❌ Pas assez d'utilisateurs pour envoyer des messages.");
            }
        }
    }
}
