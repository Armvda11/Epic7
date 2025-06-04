package com.epic7.backend.service;

import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service de gestion de l'authentification et de l'enregistrement des utilisateurs.
 * 
 * Ce service gère les opérations liées à l'authentification des utilisateurs,
 * y compris la connexion, l'enregistrement et la validation des tokens JWT.
 * 
 * @author hermas
 */
@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository; 

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil; // Utilitaire pour la gestion des tokens JWT

    /**
     * Connexion : vérifie les informations d'identification de l'utilisateur 
     * @param email
     * @param rawPassword
     * @return Un token JWT si les informations d'identification sont valides, sinon une valeur vide.
     */
    public Optional<String> loginAndGetToken(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> jwtUtil.generateToken(email));
    }
    
    /**
     * Authentifie l'utilisateur et retourne ses informations incluant son ID et token
     * @param email
     * @param rawPassword
     * @return Map contenant le token et l'ID utilisateur
     */
    public Optional<Map<String, Object>> authenticateAndGetUserInfo(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPassword()))
                .map(user -> {
                    String token = jwtUtil.generateToken(email);
                    Map<String, Object> responseMap = Map.of(
                        "message", "Connexion réussie", 
                        "token", token,
                        "id", user.getId()
                    );
                    return responseMap;
                });
    }

    /**
     * Enregistrement : crée un nouvel utilisateur avec les informations fournies.
     * @param request Les informations d'enregistrement de l'utilisateur.
     * @return Un token JWT si l'enregistrement est réussi, sinon une valeur vide.
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
     * Génère un nom d'utilisateur unique en ajoutant un suffixe aléatoire.
     * Pour la première connexion, le nom d'utilisateur est "epic7XXXX" où XXXX est un suffixe aléatoire.
     * @return Un nom d'utilisateur unique.
     */
    private String generateUniqueUsername() {
        String username;
        do {
            String suffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            username = "epic7" + suffix;
        } while (userRepository.findByUsername(username).isPresent());

        return username;
    }

    /**
     * Vérifie si le token JWT est valide.
     * @param token Le token JWT à valider.
     * @return true si le token est valide, false sinon.
     */
    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }

    /**
     * Extrait l'email de l'utilisateur à partir du token JWT.
     * @param token Le token JWT.
     * @return L'email de l'utilisateur.
     */
    public String extractEmail(String token) {
        return jwtUtil.extractEmail(token);
    }

    /**
     * Récupère l'utilisateur à partir de son email.
     * @param email L'email de l'utilisateur.
     * @return L'utilisateur correspondant à l'email.
     * @throws UsernameNotFoundException Si l'utilisateur n'est pas trouvé.
     */
    public User getUserByEmail(String email) {
    return userRepository.findByEmail(email)
        .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'email : " + email));
}

}
