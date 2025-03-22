package com.epic7.backend.service;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public Optional<String> loginAndGetToken(String email, String rawPassword) {
        Optional<User> userOpt = userRepository.findByEmail(email);
    
        if (userOpt.isPresent()) {
            User user = userOpt.get();
    
            // Utiliser PasswordEncoder pour comparer le mot de passe en clair avec le hash
            if (passwordEncoder.matches(rawPassword, user.getPassword())) {
                String token = jwtUtil.generateToken(email);
                return Optional.of(token);
            }
        }
    
        return Optional.empty();
    }

    @GetMapping("/check-token")
public ResponseEntity<String> checkToken(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader.replace("Bearer ", "");
    boolean isValid = jwtUtil.validateToken(token);
    if (isValid) {
        String email = jwtUtil.extractEmail(token);
        return ResponseEntity.ok("✅ Token valide pour : " + email);
    } else {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("❌ Token invalide");
    }
}

public boolean validateToken(String token) {
    return jwtUtil.validateToken(token);
}

public String extractEmail(String token) {
    return jwtUtil.extractEmail(token);
}
 public Optional<String> register(RegisterRequest request) {
        // Vérifier si l'email est déjà utilisé
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return Optional.empty();
        }

        // Hachage du mot de passe
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        User newUser = new User(request.getEmail(), hashedPassword);
        userRepository.save(newUser);

        // Génération d'un token JWT pour l'utilisateur enregistré
        String token = jwtUtil.generateToken(newUser.getEmail());
        return Optional.of(token);
    }

}
