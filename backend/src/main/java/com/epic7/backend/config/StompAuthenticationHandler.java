package com.epic7.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;

import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Interceptor for STOMP messages to ensure authentication.
 * This handles STOMP commands like CONNECT, SEND, SUBSCRIBE, etc.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class StompAuthenticationHandler implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final AuthService authService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null) {
            // For all commands, try to extract authentication
            if (accessor.getUser() == null) {
                // Try to get token from frame headers
                String token = null;
                
                // Check for token in Authorization header
                if (accessor.getFirstNativeHeader("Authorization") != null) {
                    token = accessor.getFirstNativeHeader("Authorization");
                    if (token != null && token.startsWith("Bearer ")) {
                        token = token.substring(7);
                    }
                }
                
                // Check for token in X-Auth-Token header as fallback
                if (token == null && accessor.getFirstNativeHeader("X-Auth-Token") != null) {
                    token = accessor.getFirstNativeHeader("X-Auth-Token");
                }
                
                // If token was found, try to authenticate
                if (token != null) {
                    try {
                        if (jwtUtil.validateToken(token)) {
                            String email = jwtUtil.extractEmail(token);
                            User user = authService.getUserByEmail(email);
                            
                            if (user != null) {
                                log.info("Successfully authenticated WebSocket message from user: {}, command: {}", 
                                    user.getUsername(), accessor.getCommand());
                                
                                // Create authentication token and set it in the accessor
                                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                    email, null, null
                                );
                                accessor.setUser(auth);
                            } else {
                                log.warn("WebSocket message authentication failed: User not found for email: {}", email);
                            }
                        } else {
                            log.warn("WebSocket message authentication failed: Invalid token");
                        }
                    } catch (Exception e) {
                        log.error("Error authenticating WebSocket message: {}", e.getMessage());
                    }
                } else {
                    // For commands that must be authenticated
                    if (accessor.getCommand() == StompCommand.SEND || 
                        accessor.getCommand() == StompCommand.SUBSCRIBE) {
                        log.warn("No authentication found for WebSocket {} command to {}", 
                            accessor.getCommand(), accessor.getDestination());
                    }
                }
            }
            
            // Special handling for the delete message command
            if (accessor.getCommand() == StompCommand.SEND && 
                accessor.getDestination() != null && 
                accessor.getDestination().equals("/app/chat.deleteMessage")) {
                
                log.info("Processing delete message command with authentication: {}", accessor.getUser());
            }
        }
        
        return message;
    }
}
