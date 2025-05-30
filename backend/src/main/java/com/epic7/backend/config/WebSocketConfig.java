package com.epic7.backend.config;

import com.epic7.backend.utils.JwtUtil;
import com.epic7.backend.service.UserDetailsServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;

/**
 * WebSocket configuration for the application.
 * Registers WebSocket handlers and configures allowed origins.
 */
@Slf4j
@Configuration
@EnableWebSocket
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer, WebSocketMessageBrokerConfigurer {

    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final Map<String, Map<String, WebSocketSession>> battleSessions = new ConcurrentHashMap<>();

    @Override
    public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
        // Register battle WebSocket handler
        registry
        .addHandler(battleWebSocketHandler(), "/socket/battle")
        .setAllowedOriginPatterns("*")
        .addInterceptors(new HttpSessionHandshakeInterceptor());
    }
    
    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Destinations des topics (canaux de diffusion)
        config.enableSimpleBroker("/topic", "/queue");
        
        // Préfixe pour les méthodes @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
        
        // Destination pour les messages spécifiques à un utilisateur
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Point d'entrée pour la connexion STOMP des clients
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Autoriser toutes les origines pour le développement
                .setAllowedOrigins("http://localhost:5173")
                .withSockJS()
                .setHeartbeatTime(10000) // Heartbeat toutes les 10 secondes
                .setDisconnectDelay(30000); // Attendre 30 secondes avant de déconnecter
    }
    
    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            @SuppressWarnings("unchecked")
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    log.info("Tentative de connexion WebSocket STOMP");
                    
                    // Try to get user ID from query parameters
                    String userId = null;
                    try {
                        // Extract any query parameters from the StompHeaderAccessor
                        if (accessor.getSessionAttributes() != null) {
                            // The SockJS handshake stores query parameters in the session
                            Map<String, String[]> parameterMap = 
                                (Map<String, String[]>) accessor.getSessionAttributes().get("javax.servlet.request.parameter_map");
                            
                            if (parameterMap != null && parameterMap.containsKey("userId")) {
                                String[] userIds = parameterMap.get("userId");
                                if (userIds != null && userIds.length > 0) {
                                    userId = userIds[0];
                                    log.info("User ID extracted from query parameters: {}", userId);
                                    
                                    // Store the userId in the headers for later use
                                    accessor.setNativeHeader("X-User-Id", userId);
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Error extracting userId from query parameters", e);
                    }
                    
                    // Extraire le token JWT du header Authorization
                    List<String> authHeaders = accessor.getNativeHeader("Authorization");
                    if (authHeaders != null && !authHeaders.isEmpty()) {
                        String authHeader = authHeaders.get(0);
                        log.info("En-tête d'autorisation présent: {}", authHeader);
                        
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            String jwt = authHeader.substring(7);
                            
                            try {
                                if (jwtUtil.validateToken(jwt)) {
                                    String email = jwtUtil.extractEmail(jwt);
                                    log.info("JWT valide pour l'utilisateur: {}", email);
                                    
                                    // Chargement des détails de l'utilisateur
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                    
                                    // Création de l'authentification
                                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());
                                    
                                    // Définir l'authentification dans le contexte de sécurité
                                    SecurityContextHolder.getContext().setAuthentication(authentication);
                                    
                                    // Définir l'utilisateur dans l'accesseur STOMP
                                    accessor.setUser(authentication);
                                    
                                    log.info("Utilisateur {} authentifié avec succès via WebSocket", email);
                                } else {
                                    log.warn("Token JWT invalide dans la connexion WebSocket");
                                }
                            } catch (Exception e) {
                                log.error("Erreur lors de la validation du JWT: {}", e.getMessage());
                            }
                        } else {
                            log.warn("Format de token invalide dans l'en-tête Authorization");
                        }
                    } else {
                        // Autoriser les connexions sans token pour le développement
                        log.warn("Pas d'en-tête Authorization dans la connexion WebSocket - autorisation anonyme");
                    }
                }
                
                return message;
            }
        });
    }

    public WebSocketHandler battleWebSocketHandler() {
        return new TextWebSocketHandler() {
            @Override
            public void afterConnectionEstablished(@NonNull WebSocketSession session) {
                log.info("WS connecté: {}", session.getId());
            }

            @Override
            protected void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage msg) {
                try {
                    var payload = objectMapper.readValue(msg.getPayload(), Map.class);
                    var type = (String) payload.get("type");
                    log.info("Message WebSocket reçu de type: {}", type);
                    
                    switch (type) {
                        case "JOIN" -> onJoin(session, payload);
                        case "USE_SKILL" -> onUseSkill(session, payload);
                        case "LEAVE" -> onLeave(session, payload);
                        default -> {
                            log.warn("Type de message inconnu: {}", type);
                            send(session, Map.of("type", "ERROR", "message", "Type de message inconnu: " + type));
                        }
                    }
                } catch (Exception e) {
                    log.error("Erreur lors du traitement du message WebSocket", e);
                    send(session, Map.of("type", "ERROR", "message", e.getMessage()));
                }
            }

            @Override
            public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
                log.info("WS fermé: {} [{}]", session.getId(), status);
                // retire la session de toutes les batailles
                battleSessions.values().forEach(m -> m.values().removeIf(s -> s.getId().equals(session.getId())));
            }

            private void onJoin(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId = (String) p.get("userId");
                
                log.info("JOIN reçu: battleId={}, userId={}", battleId, userId);
                
                if (battleId == null || userId == null) {
                    send(session, Map.of("type", "ERROR", "message", "join sans battleId/userId"));
                    return;
                }
                
                battleSessions
                  .computeIfAbsent(battleId, k -> new ConcurrentHashMap<>())
                  .put(userId, session);
                  
                send(session, Map.of("type", "JOINED", "battleId", battleId));
                broadcast(battleId, Map.of("type", "USER_JOINED", "userId", userId), userId);
                
                log.info("Utilisateur {} a rejoint la bataille {}", userId, battleId);
            }

            private void onUseSkill(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId = (String) p.get("userId");
                Long skillId = ((Number)p.get("skillId")).longValue();
                Long targetId = ((Number)p.get("targetId")).longValue();
                
                log.info("USE_SKILL reçu: battleId={}, userId={}, skillId={}, targetId={}", 
                        battleId, userId, skillId, targetId);
                
                // Ici vous appelez votre service métier battleService.useSkill(...)
                // et vous récupérez le nouvel état => newState
                
                // Pour l'exemple, on fait simplement un broadcast de l'action
                broadcast(battleId, Map.of(
                  "type", "BATTLE_UPDATE",
                  "userId", userId,
                  "skillId", skillId,
                  "targetId", targetId
                ), null);
                
                log.info("Compétence {} utilisée par {} sur {} dans la bataille {}", 
                        skillId, userId, targetId, battleId);
            }

            private void onLeave(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId = (String) p.get("userId");
                
                log.info("LEAVE reçu: battleId={}, userId={}", battleId, userId);
                
                var map = battleSessions.get(battleId);
                if (map != null) {
                    map.remove(userId);
                    log.info("Utilisateur {} a quitté la bataille {}", userId, battleId);
                }
                
                broadcast(battleId, Map.of("type", "USER_LEFT", "userId", userId), userId);
            }

            private void send(WebSocketSession s, Map<String,Object> m) {
                try {
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(objectMapper.writeValueAsString(m)));
                        log.debug("Message envoyé à la session {}: {}", s.getId(), m);
                    } else {
                        log.warn("Tentative d'envoi à une session fermée: {}", s.getId());
                    }
                } catch (Exception e) {
                    log.error("Erreur lors de l'envoi d'un message WebSocket", e);
                }
            }

            private void broadcast(String battleId, Map<String,Object> msg, String excludeUser) {
                var map = battleSessions.get(battleId);
                if (map == null) {
                    log.warn("Tentative de broadcast à une bataille inexistante: {}", battleId);
                    return;
                }
                
                log.debug("Broadcast à la bataille {}, message type: {}, exclusion: {}", 
                        battleId, msg.get("type"), excludeUser);
                
                map.forEach((uid, sess) -> {
                    if (!uid.equals(excludeUser)) {
                        send(sess, msg);
                    }
                });
            }
        };
    }
}
