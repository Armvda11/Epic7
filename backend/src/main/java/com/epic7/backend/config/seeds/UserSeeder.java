package com.epic7.backend.config.seeds;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserSeeder {
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public void seedUsers() {
        if (userRepo.findByEmail("hermas@example.com").isEmpty()) {
            User u1 = createUser("hermas@example.com", "hermas", "toi", 5000, 100);
            User u2 = createUser("arya@example.com", "arya", "secret", 3000, 50);
            User u3 = createUser("corentin@example.com", "Kaldah", "test", 999999, 9999);
            userRepo.saveAll(List.of(u1, u2, u3));
            System.out.println("✅ Utilisateurs créés.");
        }
    }

    private User createUser(String email, String username, String rawPwd, int gold, int diamonds) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPwd));
        user.setGold(gold);
        user.setDiamonds(diamonds);
        return user;
    }
}
