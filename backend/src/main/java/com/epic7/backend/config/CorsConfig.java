package com.epic7.backend.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration CORS pour permettre les requêtes cross-origin.
 * Permet aux clients de se connecter à l'API depuis des origines différentes.
 * @author hermas
 */
// TODO: A modifier pour la prod ; supprimer le localhost et le PUT ,DELETE et OPTIONS
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Authorization", "Content-Type", "X-User-Id", "x-user-id", 
                               "Access-Control-Allow-Origin", "Access-Control-Allow-Methods", 
                               "Access-Control-Allow-Headers")
                .allowCredentials(true);
    }
}
