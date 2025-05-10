package com.epic7.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
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
public class WebSocketStompConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    private final StompAuthenticationHandler stompAuthenticationHandler;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for topics and queues
        config.enableSimpleBroker("/topic", "/queue");
        
        // Set the prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // In development mode, don't use JWT interceptor to avoid authentication issues
        // REMOVE THIS IN PRODUCTION AND USE PROPER AUTHENTICATION
        registry
            .addEndpoint("/ws-chat")
            .setAllowedOriginPatterns("*")
            // Authentication interceptor restored for production
            .addInterceptors(jwtHandshakeInterceptor)
            .withSockJS(); // for fallback
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Add our authentication handler for all inbound messages
        registration.interceptors(stompAuthenticationHandler);
    }
}
