package com.epic7.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket configuration for the application.
 * Registers WebSocket handlers and configures allowed origins.
 */
@Slf4j
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final ObjectMapper objectMapper;
    private final Map<String, Map<String, WebSocketSession>> battleSessions = new ConcurrentHashMap<>();

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register battle WebSocket handler
        registry
        .addHandler(battleWebSocketHandler(), "/socket/battle")
        .setAllowedOriginPatterns("*")
        .addInterceptors(new HttpSessionHandshakeInterceptor());
    }

    public WebSocketHandler battleWebSocketHandler() {
        return new TextWebSocketHandler() {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) {
                log.info("WS connecté: {}", session.getId());
            }

            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage msg) {
                try {
                    var payload = objectMapper.readValue(msg.getPayload(), Map.class);
                    var type    = (String) payload.get("type");
                    switch (type) {
                        case "JOIN"      -> onJoin(session, payload);
                        case "USE_SKILL" -> onUseSkill(session, payload);
                        case "LEAVE"     -> onLeave(session, payload);
                        default          -> log.warn("Message inconnu: {}", type);
                    }
                } catch (Exception e) {
                    log.error("Erreur WS", e);
                    send(session, Map.of("type","ERROR","message",e.getMessage()));
                }
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                log.info("WS fermé: {} [{}]", session.getId(), status);
                // retire la session de toutes les batailles
                battleSessions.values().forEach(m -> m.values().removeIf(s -> s.getId().equals(session.getId())));
            }

            private void onJoin(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId   = (String) p.get("userId");
                if (battleId==null||userId==null) {
                    send(session, Map.of("type","ERROR","message","join sans battleId/userId"));
                    return;
                }
                battleSessions
                .computeIfAbsent(battleId, k->new ConcurrentHashMap<>())
                .put(userId, session);
                send(session, Map.of("type","JOINED","battleId",battleId));
                broadcast(battleId, Map.of("type","USER_JOINED","userId",userId), userId);
            }

            private void onUseSkill(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId   = (String) p.get("userId");
                Long   skillId  = ((Number)p.get("skillId")).longValue();
                Long   targetId = ((Number)p.get("targetId")).longValue();
                // ici vous appelez votre service métier battleService.useSkill(...)
                // et vous récupérez le nouvel état => newState
                // pour l’exemple on rebroadcast :
                broadcast(battleId, Map.of(
                "type","BATTLE_UPDATE",
                "userId",userId,
                "skillId",skillId,
                "targetId",targetId
                ), null);
            }

            private void onLeave(WebSocketSession session, Map<String,Object> p) {
                String battleId = (String) p.get("battleId");
                String userId   = (String) p.get("userId");
                var map = battleSessions.get(battleId);
                if (map!=null) map.remove(userId);
                broadcast(battleId, Map.of("type","USER_LEFT","userId",userId), userId);
            }

            private void send(WebSocketSession s, Map<String,Object> m) {
                try {
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(objectMapper.writeValueAsString(m)));
                    }
                } catch (Exception e) {
                    log.error("Erreur d’envoi WS", e);
                }
            }

            private void broadcast(String battleId, Map<String,Object> msg, String excludeUser) {
                var map = battleSessions.get(battleId);
                if (map==null) return;
                map.forEach((uid,sess) -> {
                    if (!uid.equals(excludeUser)) send(sess,msg);
                });
            }
        };
    }
}
