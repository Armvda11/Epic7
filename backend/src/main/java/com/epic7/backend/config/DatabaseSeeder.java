package com.epic7.backend.config;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        // Ajouter un utilisateur par défaut pour tester la connexion
        if (userRepository.findByEmail("hermas@example.com").isEmpty()) {
            userRepository.save(new User("hermas@example.com", "toi"));
        }
    }
}
