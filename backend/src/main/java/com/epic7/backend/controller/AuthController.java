package com.epic7.backend.controller;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        Optional<String> tokenOpt = authService.loginAndGetToken(email, password);

        if (tokenOpt.isPresent()) {
            return Map.of("message", "Connexion réussie", "token", tokenOpt.get());
        } else {
            return Map.of("message", "Échec de l'authentification");
        }
    }


    @GetMapping("/check-token")
public ResponseEntity<String> checkToken(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader.replace("Bearer ", "");
    boolean isValid = authService.validateToken(token);
    if (isValid) {
        String email = authService.extractEmail(token);
        return ResponseEntity.ok("✅ Token valide pour : " + email);
    } else {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("❌ Token invalide");
    }
}

    @GetMapping("/secure-info")
    public String infoSensible(Authentication auth) {
        return "Bienvenue " + auth.getName() + ", vous êtes authentifié.";
    }

    // register pour l'inscription et la création de token
    @PostMapping("/register")
        public ResponseEntity<?> register(@Validated @RequestBody RegisterRequest request) {
            Optional<String> tokenOpt = authService.register(request);
            
            if (tokenOpt.isPresent()) {
                return ResponseEntity.ok(Map.of("message", "Inscription réussie", "token", tokenOpt.get()));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Email déjà utilisé"));
            }
    }
}
