package com.epic7.backend.security;

import com.epic7.backend.utils.JwtUtil;
import io.jsonwebtoken.JwtException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;
import java.io.IOException;
import java.util.Collections;

/**
 * Filtre de sécurité JWT pour authentifier les utilisateurs via un token JWT.
 * Ce filtre est exécuté pour chaque requête HTTP afin de valider le token
 * et d'authentifier l'utilisateur dans le contexte de sécurité de Spring.
 *
 * @author hermas
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    // Injecter le JwtUtil pour valider et extraire les informations du token
    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Méthode principale du filtre qui s'exécute pour chaque requête.
     * Elle vérifie la présence d'un token JWT dans l'en-tête Authorization,
     * verifie sa validité et s'occupe de l'authentification de l'utilisateur.
     * @param request La requête HTTP
     * @param response La réponse HTTP
     * @param filterChain La chaîne de filtres
     * @throws ServletException En cas d'erreur de servlet
     * @throws IOException En cas d'erreur d'entrée/sortie
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization"); // Récupére l'en-tête

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7); // Supprime "Bearer "

            try {
                if (jwtUtil.validateToken(token)) {
                    String email = jwtUtil.extractEmail(token);

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            email, null, Collections.emptyList());

                    // enregistrer dans le contexte de sécurité
                    // pour que Spring Security sache que l'utilisateur est authentifié
                    // et qu'il a le rôle d'utilisateur
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException e) {
                System.out.println("❌ JWT invalide : " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
