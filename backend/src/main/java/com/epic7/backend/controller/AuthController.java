package com.epic7.backend.controller;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        return authService.loginAndGetToken(email, password)
                .map(token -> ResponseEntity.ok(Map.of("message", "Connexion réussie", "token", token)))
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "Échec de l'authentification")));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        return authService.register(request)
                .map(token -> ResponseEntity.ok(Map.of("message", "Inscription réussie", "token", token)))
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "Email déjà utilisé")));
    }

    @GetMapping("/check-token")
    public ResponseEntity<?> checkToken(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (authService.validateToken(token)) {
            String email = authService.extractEmail(token);
            return ResponseEntity.ok("✅ Token valide pour : " + email);
        }
        return ResponseEntity.status(401).body("❌ Token invalide");
    }

    @GetMapping("/secure-info")
    public String securedInfo(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        return "✅ Accès autorisé pour : " + authService.extractEmail(token);
    }
}
