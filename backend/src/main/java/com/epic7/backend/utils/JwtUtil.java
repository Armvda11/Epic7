package com.epic7.backend.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
/**
 * Utilitaire pour la gestion des tokens JWT (JSON Web Tokens).
 * 
 * Ce composant est responsable de la génération, de la validation et de l'extraction
 * des informations contenues dans les tokens JWT.
 * 
 * @author hermas
 */
@Component
public class JwtUtil {
    // Clé secrète pour signer les tokens JWT
    private final Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private final long EXPIRATION_TIME = 86400000; // 1 jour en ms

    /**
     * Génère un token JWT pour l'utilisateur avec l'email spécifié.
     * 
     * @param email L'email de l'utilisateur pour lequel le token est généré.
     * @return Le token JWT généré.
     */
    public String generateToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }

    /**
     * Extrait le token JWT du header Authorization 
     * @param request
     * @return The extracted token or null if no valid token is found
     */
    public String extractTokenFromHeader(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null; // Return null instead of throwing an exception
    }

}
