package com.epic7.backend.config;

import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Intercepts WebSocket handshakes to authenticate users with JWT tokens.
 * Extracts the JWT token from the Authorization header and validates it.
 * If valid, adds the user to the WebSocket session attributes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;
    private final AuthService authService;

    @Override
    public boolean beforeHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response,
                                @NonNull WebSocketHandler wsHandler, @NonNull Map<String, Object> attributes) {
        log.info("Processing WebSocket handshake request");
        
        if (request instanceof ServletServerHttpRequest servletRequest) {
            // First try to extract token from Authorization header
            String token = jwtUtil.extractTokenFromHeader(servletRequest.getServletRequest());

            if (token != null) {
                try {
                    if (jwtUtil.validateToken(token)) {
                        String email = jwtUtil.extractEmail(token);
                        if (email == null) {
                            log.warn("WebSocket Authentication failed: No email found in token");
                            return false;
                        }
                        
                        User user = authService.getUserByEmail(email);
                        
                        if (user != null) {
                            log.info("User authenticated in WebSocket handshake: {}", user.getUsername());
                            attributes.put("currentUser", user);
                            return true;
                        } else {
                            log.warn("WebSocket Authentication failed: User not found for email: {}", email);
                        }
                    } else {
                        log.warn("WebSocket Authentication failed: Token validation failed");
                    }
                } catch (Exception e) {
                    log.error("WebSocket Authentication error: {}", e.getMessage(), e);
                }
            } else {
                log.warn("WebSocket connection without token");
            }
        } else {
            log.warn("WebSocket request is not a ServletServerHttpRequest");
        }
        
        log.warn("WebSocket handshake authentication failed");
        return false; // Reject the handshake if authentication fails
    }

    @Override
    public void afterHandshake(@NonNull ServerHttpRequest request, @NonNull ServerHttpResponse response, 
                            @NonNull WebSocketHandler wsHandler, @Nullable Exception exception) {
        // Nothing to do after handshake
    }
}