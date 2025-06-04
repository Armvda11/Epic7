package com.epic7.backend.controller;
import java.lang.annotation.ElementType;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.epic7.backend.config.seeds.HeroSeeder;
import com.epic7.backend.dto.RegisterRequest;
import com.epic7.backend.dto.UserDTO;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.Element;
import com.epic7.backend.model.enums.Rarity;
import com.epic7.backend.repository.HeroRepository;
import com.epic7.backend.repository.UserRepository;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final HeroRepository heroRepository;
    private final UserRepository userRepository;
    private final HeroSeeder heroSeeder;
    
    
    /**
     * Récupère la liste de tous les utilisateurs.
     * Accessible uniquement aux administrateurs.
     * @return La liste de tous les utilisateurs
     */
     @GetMapping("/users")
    public ResponseEntity<List<UserSummaryDTO>> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();
            List<UserSummaryDTO> dtos = users.stream()
                    .map(UserSummaryDTO::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

     private static class UserSummaryDTO {
        private Long id;
        private String username;
        private String email;
        private int level;
        private int rank;
        private String registerDate;

        public UserSummaryDTO(User user) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.level = user.getLevel();
            this.rank = user.getRank();
            this.registerDate = user.getRegisterDateString(); // formatée dans l'entité User
        }

        // Getters obligatoires pour la sérialisation JSON
        public Long getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public int getLevel() { return level; }
        public int getRank() { return rank; }
        public String getRegisterDate() { return registerDate; }
    }
    
    /**
     * Récupère les détails d'un utilisateur spécifique.
     * @param userId ID de l'utilisateur
     * @return Les détails de l'utilisateur
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<User> getUserDetails(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            //log.error("Erreur lors de la récupération des détails de l'utilisateur", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

     @PostMapping("/create")
    public ResponseEntity<Hero> createHero(HttpServletRequest request) {
         String name = request.getParameter("nom");
        String elementStr = request.getParameter("element");
        String rarityStr = request.getParameter("rarity");

        int attack = Integer.parseInt(request.getParameter("attack"));
        int defense = Integer.parseInt(request.getParameter("defense"));
        int speed = Integer.parseInt(request.getParameter("speed"));
        int hp = Integer.parseInt(request.getParameter("hp"));

        Element element = Element.valueOf(elementStr.toUpperCase());
        Rarity rarity = Rarity.valueOf(rarityStr.toUpperCase());

        Hero hero = heroSeeder.ajouterHero(name, element, rarity, attack, defense, speed, hp);
        return ResponseEntity.ok(hero);
    }

    /* @PostMapping("/create")
    public ResponseEntity<Hero> createHero(@RequestBody Hero hero) {
        Hero saved = heroRepository.save(hero);
        return ResponseEntity.ok(saved);
    } */



   /**
     * Récupère la liste de tous les héros.
     * Accessible uniquement aux administrateurs.
     * @return La liste de tous les héros
     */
    @GetMapping("/heroes")
    public ResponseEntity<List<Hero>> getAllHeroes() {
        try {
            List<Hero> heroes = heroRepository.findAll();
            return ResponseEntity.ok(heroes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
}
