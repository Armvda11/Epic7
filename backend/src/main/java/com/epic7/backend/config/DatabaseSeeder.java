package com.epic7.backend.config;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // Injecter l'encodeur


    @Override
    public void run(String... args) throws Exception {
        // Ajouter un utilisateur par défaut pour tester la connexion
        if (userRepository.findByEmail("hermas@example.com").isEmpty()) {
            String hashedPassword = passwordEncoder.encode("toi"); // Chiff
            userRepository.save(new User("hermas@example.com", hashedPassword));
        }
    }
}
