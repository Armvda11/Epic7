package com.epic7.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration for WebSocket STOMP messaging.
 * Used primarily for chat features (global, guild, and duel chats).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class ChatWebSocketStompConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final ChatStompAuthenticationHandler stompAuthenticationHandler;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for topics and queues
        config.enableSimpleBroker("/topic", "/queue");
        
        // Set the prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Register STOMP endpoints with JWT authentication
        registry
            .addEndpoint("/ws-chat")
            .setAllowedOriginPatterns("*") // In production, consider restricting to specific origins
            .addInterceptors(jwtHandshakeInterceptor)
            .withSockJS(); // for fallback
    }
    
    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Add our authentication handler for all inbound messages
        registration.interceptors(stompAuthenticationHandler);
    }
}
