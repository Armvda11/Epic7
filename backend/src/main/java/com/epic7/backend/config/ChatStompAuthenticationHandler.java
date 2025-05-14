package com.epic7.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.lang.NonNull;

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
public class ChatStompAuthenticationHandler implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final AuthService authService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null) {
            // Check if user is already authenticated through Spring Security
            if (accessor.getUser() == null) {
                // User not authenticated yet, try to authenticate via JWT token
                String token = extractToken(accessor);
                
                if (token != null) {
                    // Try to authenticate with the token
                    if (!authenticateWithToken(token, accessor)) {
                        // Authentication failed
                        return rejectIfRequired(accessor);
                    }
                    // If authentication succeeded, accessor.getUser() will now return the authenticated user
                } else if (requiresAuthentication(accessor)) {
                    // No token found, but this command requires authentication
                    log.warn("Rejecting unauthenticated WebSocket {} command to {}", 
                        accessor.getCommand(), accessor.getDestination());
                    return null; // Reject unauthenticated messages
                }
            }
            
            // Special handling for authenticated commands
            processSpecialCommands(accessor);
        } else {
            log.warn("STOMP header accessor is null");
        }
        
        return message;
    }
    
    /**
     * Extract JWT token from STOMP headers
     */
    private String extractToken(StompHeaderAccessor accessor) {
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
        
        return token;
    }
    
    /**
     * Authenticate user with JWT token
     * @return true if authentication successful, false otherwise
     */
    private boolean authenticateWithToken(String token, StompHeaderAccessor accessor) {
        try {
            if (!jwtUtil.validateToken(token)) {
                log.warn("WebSocket message authentication failed: Invalid token");
                return false;
            }
            
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                log.warn("WebSocket message authentication failed: No email found in token");
                return false;
            }
            
            User user = authService.getUserByEmail(email);
            if (user == null) {
                log.warn("WebSocket message authentication failed: User not found for email: {}", email);
                return false;
            }
            
            // Successfully authenticated - create and set authentication token
            log.info("Successfully authenticated WebSocket message from user: {}, command: {}", 
                user.getUsername(), accessor.getCommand());
            
            // Create authentication token with the same format as your REST API
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                email, null, null
            );
            accessor.setUser(auth);
            
            return true;
        } catch (Exception e) {
            log.error("Error authenticating WebSocket message: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if the command requires authentication
     */
    private boolean requiresAuthentication(StompHeaderAccessor accessor) {
        return accessor.getCommand() == StompCommand.SEND || 
                accessor.getCommand() == StompCommand.SUBSCRIBE;
    }
    
    /**
     * Process special commands that might need additional handling
     */
    private void processSpecialCommands(StompHeaderAccessor accessor) {
        // Special handling for the delete message command
        if (accessor.getCommand() == StompCommand.SEND && 
            accessor.getDestination() != null && 
            "/app/chat.deleteMessage".equals(accessor.getDestination())) {
            
            log.info("Processing delete message command with authentication: {}", accessor.getUser());
        }
    }
    
    /**
     * Helper method to reject SEND or SUBSCRIBE messages if authentication failed
     */
    private Message<?> rejectIfRequired(StompHeaderAccessor accessor) {
        if (accessor != null && (accessor.getCommand() == StompCommand.SEND || 
                                accessor.getCommand() == StompCommand.SUBSCRIBE)) {
            return null; // Reject the message
        }
        return null; // Return null to reject all messages with failed authentication
    }
}
