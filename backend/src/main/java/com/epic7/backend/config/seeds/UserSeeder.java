package com.epic7.backend.config.seeds;

import java.util.List;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.epic7.backend.model.User;
import com.epic7.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserSeeder {
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void seedUsers() {
        boolean shouldSeedUsers = userRepo.count() == 0;
        
        if (shouldSeedUsers) {
            // Créez un utilisateur administrateur avec un email et un mot de passe par défaut
            // Il doit être le premier utilisateur créé
            User u0 = createUser("admin@epic7.com", "Admin", "password", 999999999, 999999999);
            setupStats(u0, 100, 999, "Champion", 500, 50);
            
            User u1 = createUser("hermas@example.com", "hermas", "toi", 5000, 100);
            setupStats(u1, 50, 750, "Silver", 200, 30);
            
            User u2 = createUser("arya@example.com", "arya", "secret", 3000, 50);
            setupStats(u2, 30, 500, "Gold", 100, 20);
            
            User u3 = createUser("corentin@example.com", "Kaldah", "test", 9999999, 9999999);
            setupStats(u3, 80, 850, "Bronze", 350, 40);
            
            User u4 = createUser("yannis@example.com", "Han", "test2", 10000, 10000);
            setupStats(u3, 80, 850, "Bronze", 350, 40);

            userRepo.saveAll(List.of(u0, u1, u2, u3,u4));
            System.out.println("✅ Utilisateurs créés.");
        } else {
            System.out.println("✅ Les utilisateurs existent déjà.");
        }
    }

    private User createUser(String email, String username, String rawPwd, int gold, int diamonds) {
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPwd));
        user.setGold(gold);
        user.setDiamonds(diamonds);
        
        // Initialisation des nouveaux attributs avec des valeurs par défaut
        user.setRegisterDate(Instant.now().minus(30, ChronoUnit.DAYS)); // Inscription il y a 30 jours
        user.setLastLogin(Instant.now().minus(1, ChronoUnit.DAYS)); // Dernière connexion il y a 1 jour
        
        return user;
    }
    
    /**
     * Configure les statistiques de l'utilisateur
     * @param user Utilisateur à configurer
     * @param level Niveau de l'utilisateur
     * @param rank Rang de l'utilisateur
     * @param arenaTier Niveau dans l'arène (Bronze, Silver, Gold, etc.)
     * @param winNumber Nombre de victoires
     * @param loseNumber Nombre de défaites
     */
    private void setupStats(User user, int level, int rank, String arenaTier, int winNumber, int loseNumber) {
        user.setLevel(level);
        user.setRank(rank);
        user.setArenaTier(arenaTier);
        user.setWinNumber(winNumber);
        user.setLoseNumber(loseNumber);
        
        // Dates aléatoires pour simuler des utilisateurs créés à différentes périodes
        int randomDays = (int) (Math.random() * 100) + 10; // Entre 10 et 110 jours
        int lastLoginDays = (int) (Math.random() * 10); // Entre 0 et 10 jours
        
        user.setRegisterDate(Instant.now().minus(randomDays, ChronoUnit.DAYS));
        user.setLastLogin(Instant.now().minus(lastLoginDays, ChronoUnit.DAYS));
    }
}
