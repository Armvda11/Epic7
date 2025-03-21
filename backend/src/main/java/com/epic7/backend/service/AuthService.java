package com.epic7.backend.service;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    public Optional<String> loginAndGetToken(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent() && user.get().getPassword().equals(password)) {
            String token = jwtUtil.generateToken(email);
            System.out.println("🔐 Utilisateur authentifié : " + email);
            System.out.println("🪪 Token généré : " + token);
            return Optional.of(token);
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


}
