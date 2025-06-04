package com.epic7.backend.controller;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Contrôleur REST pour la gestion de l'authentification et de l'inscription.
 * Ce contrôleur gère les requêtes liées à l'authentification des utilisateurs,
 * y compris la connexion, l'inscription et la vérification des tokens JWT.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins =
        "http://localhost:5173", 
    allowedHeaders = {"Authorization", "Content-Type", "X-User-Id", "x-user-id"}
)
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    /**
     * Constructeur de la classe AuthController.
     *
     * @param authService Le service d'authentification.
     * @param jwtUtil     L'utilitaire JWT pour la gestion des tokens.
     */
    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Endpoint pour la connexion d'un utilisateur.
     * @param request Contient l'email et le mot de passe de l'utilisateur.
     * @return Un token JWT si la connexion est réussie, sinon un message d'erreur.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        return authService.authenticateAndGetUserInfo(email, password)
                .map(userInfo -> ResponseEntity.ok(userInfo))
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "Échec de l'authentification")));
    }

    /**
     * Endpoint pour l'inscription d'un nouvel utilisateur.
     * @param request Contient l'email et le mot de passe de l'utilisateur.
     * @return Un message de succès ou d'erreur.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        return authService.register(request)
                .map(token -> ResponseEntity.ok(Map.of("message", "Inscription réussie", "token", token)))
                .orElse(ResponseEntity.badRequest().body(Map.of("message", "Email déjà utilisé")));
    }

    /**
     * Endpoint pour vérifier la validité d'un token JWT.
     * @param authHeader Le header d'autorisation contenant le token JWT.
     * @return Un message indiquant si le token est valide ou non.
     */
    @GetMapping("/check-token")
    public ResponseEntity<?> checkToken(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (authService.validateToken(token)) {
            String email = authService.extractEmail(token);
            return ResponseEntity.ok("✅ Token valide pour : " + email);
        }
        return ResponseEntity.status(401).body("❌ Token invalide");
    }

    /**
     * Endpoint sécurisé pour tester l'accès avec un token JWT valide.
     * @param request La requête HTTP contenant le token JWT.
     * @return Un message indiquant si l'accès est autorisé ou non.
     */
    @GetMapping("/secure-info")
    public String securedInfo(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        return "Accès autorisé pour : " + authService.extractEmail(token);
    }
}
