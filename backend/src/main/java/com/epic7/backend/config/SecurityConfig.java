package com.epic7.backend.config;

import com.epic7.backend.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuration de la sécurité de l'application.
 * Définit les règles de sécurité pour les requêtes HTTP et l'authentification.
 * @author hermas
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // Constructeur
    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    // Configuration de la sécurité
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll() // login reste ouvert
                .requestMatchers("/api/skills/**").permitAll() // les compétences sont ouvertes
                .requestMatchers("/api/chat/rooms/global").authenticated() // allow accessing global chat without auth
                .requestMatchers("/api/combat/**").authenticated() // les combats sont ouverts
                .requestMatchers("/api/user/me").permitAll() // Allow checking user status without authentication
                // WebSocket endpoints - allow all for development (important for chat functionality)
                .requestMatchers("/ws-chat/**").permitAll()
                .requestMatchers("/topic/**").permitAll()
                .requestMatchers("/app/**").permitAll()
                .anyRequest().authenticated()               // tout le reste est protégé
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
      
        return http.build();
    }

    // Utilisé pour l'authentification
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }


    // Utilisé pour hasher les mots de passe
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
