package com.epic7.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // endpoint /ws que les clients utiliseront pour se connecter (avec SockJS fallback)
        registry
          .addEndpoint("/ws")
          .setAllowedOriginPatterns("*")
          .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // préfixe pour les messages envoyés depuis le client vers @MessageMapping
        registry.setApplicationDestinationPrefixes("/app");
        // sujets que le broker gérera pour les broadcasts
        registry.enableSimpleBroker("/topic", "/queue");
        // préfixe pour les envois ciblés aux utilisateurs
        registry.setUserDestinationPrefix("/user");
    }
}
