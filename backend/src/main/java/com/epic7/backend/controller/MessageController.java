package com.epic7.backend.controller;

import com.epic7.backend.model.User;
import com.epic7.backend.service.MessageService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.utils.JwtUtil;
import com.epic7.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Contrôleur REST pour gérer les messages.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/messages")
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
     * @return Une liste de messages de l'utilisateur.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMessages(HttpServletRequest request) {
        User user = getCurrentUser(request);
        return ResponseEntity.ok(messageService.getMessages(user));
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
}
