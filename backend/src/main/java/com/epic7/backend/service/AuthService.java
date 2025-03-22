package com.epic7.backend.service;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Connexion : vérifie email + mot de passe et renvoie un token JWT
     */
    public Optional<String> loginAndGetToken(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> jwtUtil.generateToken(email));
    }

    /**
     * Enregistrement : crée un utilisateur avec un nom unique et retourne un JWT
     */
    public Optional<String> register(RegisterRequest request) {
        // Vérifier l'unicité de l'email
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return Optional.empty();
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // Générer un username unique
        String username = generateUniqueUsername();

        User newUser = new User();
        newUser.setEmail(request.getEmail());
        newUser.setPassword(hashedPassword);
        newUser.setUsername(username);
        newUser.setLevel(1);
        newUser.setGold(0);
        newUser.setDiamonds(0);

        userRepository.save(newUser);
        return Optional.of(jwtUtil.generateToken(newUser.getEmail()));
    }

    /**
     * Génère un username unique du type epic7A1B2
     */
    private String generateUniqueUsername() {
        String username;
        do {
            String suffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            username = "epic7" + suffix;
        } while (userRepository.findByUsername(username).isPresent());

        return username;
    }

    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }

    public String extractEmail(String token) {
        return jwtUtil.extractEmail(token);
    }

    public User getUserByEmail(String email) {
    return userRepository.findByEmail(email)
        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'email : " + email));
}

}
