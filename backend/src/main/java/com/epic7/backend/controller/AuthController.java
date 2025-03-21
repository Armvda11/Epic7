package com.epic7.backend.controller;

import com.epic7.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")  // Permettre au frontend d'accéder au backend
public class AuthController {

    @Autowired
    private AuthService authService;

    @GetMapping("/")
    public String checkApi() {
        return "API Auth OK";
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        boolean isAuthenticated = authService.authenticate(email, password);

        if (isAuthenticated) {
            return Map.of("message", "Connexion réussie !");
        } else {
            return Map.of("message", "Échec de l'authentification, vérifiez vos identifiants.");
        }
    }
}
