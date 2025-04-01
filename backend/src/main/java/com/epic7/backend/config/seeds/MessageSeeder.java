package com.epic7.backend.config.seeds;

import com.epic7.backend.model.Message;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.MessageRepository;
import com.epic7.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import com.epic7.backend.service.MessageService;

import java.time.Instant;
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
                    message.setSender(sender);
                    message.setRecipient(user);
                    message.setSubject("Bienvenue dans le jeu !");
                    message.setMessage("Salut " + user.getUsername() + ", bienvenue sur Epic7 !");
                    message.setCreatedAt(Instant.now());
                    message.setValidUntil(Instant.now().plusSeconds(7 * 24 * 60 * 60)); // 7 jours de validité
                    messageRepo.save(message);

                    // Test de FriendRequest
                    messageService.sendFriendRequest(sender, user.getId());

                    // Test d'envoie de plusieurs shopping item
                    List<Long> itemIds = List.of(1L, 2L, 3L); // Remplacez par les IDs d'articles valides
                    messageService.sendItemMessage(sender, user, "Cadeau de bienvenue reçu !" , "Voici un cadeau de bienvenue pour toi !", itemIds, Instant.now());
                }

                System.out.println("✅ Messages de bienvenue envoyés.");
            } else {
                System.out.println("❌ Pas assez d'utilisateurs pour envoyer des messages.");
            }
        }
    }
}
