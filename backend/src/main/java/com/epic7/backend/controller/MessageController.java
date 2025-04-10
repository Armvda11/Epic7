package com.epic7.backend.controller;

import com.epic7.backend.model.User;
import com.epic7.backend.service.MessageService;
import com.epic7.backend.utils.JwtUtil;
import com.epic7.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.epic7.backend.model.Message;
import com.epic7.backend.dto.MessageInfoDTO;
import com.epic7.backend.dto.MessageDTO;


/**
 * Contrôleur REST pour gérer les messages.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mailbox")
public class MessageController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final MessageService messageService;

    /**
     * Utilitaire pour extraire l'utilisateur connecté via le token JWT dans les headers.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Récupère les messages d'un utilisateur.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return Les infos des messages de l'utilisateur.
     */
    @GetMapping("/messages")
    public ResponseEntity<?> getMailbox(HttpServletRequest request) {
        User user = getCurrentUser(request);
        // Récupérer les infos des messages de la boîte de réception de l'utilisateur
        // et les retourner dans la réponse

        List<Message> messages = messageService.getMessages(user);
        List<MessageInfoDTO> messageInfoDTOs = messages.stream()
                .map(message -> new MessageInfoDTO(
                        message.getId(),
                        message.getSender(),
                        message.getSubject(),
                        message.getCreatedAt().toString(),
                        message.getValidUntil().toString(),
                        message.isRead(),
                        message.isContainItems(),
                        message.isFriendRequest()
                ))
                .toList();
                messageInfoDTOs.forEach(message -> {
                System.out.println("Message ID: " + message.getId() + ", Is Read: " + message.isRead() + ", Contains Items: " + message.isContainItems() + ", Is Friend Request: " + message.isFriendRequest());
                });
        return ResponseEntity.ok(messageInfoDTOs);
    }

    @GetMapping("/message/{id}")
    public ResponseEntity<?> getMessageById(HttpServletRequest request, @PathVariable Long id) {
        User user = getCurrentUser(request);
        Message message = messageService.getMessageById(id, user);
        MessageDTO messageDTO = new MessageDTO(
                message.getId(),
                message.getSender(),
                messageService.getSenderId(message),
                message.getRecipient().getUsername(),
                message.getSubject(),
                message.getMessage(),
                message.getCreatedAt().toString(),
                message.getValidUntil().toString(),
                message.getTargetShopItemsId(),
                message.isRead(),
                message.isContainItems(),
                message.isFriendRequest()
        );
        return ResponseEntity.ok(messageDTO);
    }
    
    /**
     * Envoie un message à un autre utilisateur.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @param recipientId L'ID du destinataire.
     * @param message Le contenu du message.
     * @return Une réponse indiquant le succès ou l'échec de l'envoi.
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(HttpServletRequest request,
                                        @RequestParam Long recipientId,
                                        @RequestParam String subject,
                                        @RequestParam String message) {
        User sender = getCurrentUser(request);
        return ResponseEntity.ok(messageService.sendMessage(sender, recipientId, subject ,message));
    }

    /**
     * Supprime un message de la boîte de réception de l'utilisateur.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @param id L'ID du message à supprimer.
     * @return Une réponse indiquant le succès ou l'échec de la suppression.
     */
    @PostMapping("/delete/{id}")
    public ResponseEntity<?> deleteMessage(HttpServletRequest request, @PathVariable Long id) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(messageService.deleteMessage(id, user.getId()));
    }


    /**
     * Marque un message comme lu.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @param id L'ID du message à marquer comme lu.
     * @return Une réponse indiquant le succès ou l'échec de l'opération.
     */
    @PostMapping("/read/{id}")
    public ResponseEntity<?> markAsRead(HttpServletRequest request, @PathVariable Long id) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(messageService.markMessageAsRead(id, user.getId()));
    }

    /**
     * Récupère les objets d'un message.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @param id L'ID du message dont on veut récupérer les objets.
     * @return Une réponse indiquant le succès ou l'échec de l'opération.
     */
    @PostMapping("/retrieve-items/{id}")
    public ResponseEntity<?> retrieveItems(HttpServletRequest request, @PathVariable Long id) {
        User user = getCurrentUser(request);
        try {
            if (id == null) {
                return ResponseEntity.badRequest().body("ID de message manquant");
            }
            
            messageService.retrieveItemsFromMessage(id, user.getId());
            return ResponseEntity.ok(true);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur interne: " + e.getMessage());
        }
    }
}
