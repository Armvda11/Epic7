package com.epic7.backend.controller;

import com.epic7.backend.dto.PlayerHeroViewDTO;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Contrôleur REST pour gérer les héros possédés par un joueur (PlayerHero).
 */
@RestController
@RequestMapping("/api/player-hero")
public class PlayerHeroController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final PlayerHeroService playerHeroService;

    public PlayerHeroController(JwtUtil jwtUtil, AuthService authService, PlayerHeroService playerHeroService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.playerHeroService = playerHeroService;
    }

    /**
     * Utilitaire pour extraire l'utilisateur connecté via le token JWT dans les headers.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Gagne de l'expérience pour un héros spécifique du joueur.
     * @param heroId ID du héros joueur (PlayerHero)
     * @param amount Quantité d'expérience à ajouter
     */
    @PostMapping("/{heroId}/gain-xp")
    public ResponseEntity<String> gainExperience(@PathVariable Long heroId,
                                                 @RequestParam int amount,
                                                 HttpServletRequest request) {
        User user = getCurrentUser(request);
        Optional<PlayerHero> optionalHero = Optional.ofNullable(playerHeroService.findById(heroId));

        if (optionalHero.isEmpty()) {
            return ResponseEntity.badRequest().body("Héros non trouvé.");
        }

        PlayerHero hero = optionalHero.get();

        if (!hero.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Ce héros ne vous appartient pas.");
        }

        try {
            playerHeroService.gainExperience(hero, amount);
            return ResponseEntity.ok("✅ Expérience ajoutée. Niveau actuel : " + hero.getLevel());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Verrouille un héros (empêche la modification, vente, etc.)
     */
    @PostMapping("/{heroId}/lock")
    public ResponseEntity<String> lockHero(@PathVariable Long heroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        Optional<PlayerHero> optionalHero = Optional.ofNullable(playerHeroService.findById(heroId));

        if (optionalHero.isEmpty()) {
            return ResponseEntity.badRequest().body("Héros non trouvé.");
        }

        PlayerHero hero = optionalHero.get();
        if (!hero.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Ce héros ne vous appartient pas.");
        }

        playerHeroService.lockHero(hero);
        return ResponseEntity.ok("🔒 Héros verrouillé.");
    }

    /**
     * Déverrouille un héros.
     */
    @PostMapping("/{heroId}/unlock")
    public ResponseEntity<String> unlockHero(@PathVariable Long heroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        Optional<PlayerHero> optionalHero = Optional.ofNullable(playerHeroService.findById(heroId));

        if (optionalHero.isEmpty()) {
            return ResponseEntity.badRequest().body("Héros non trouvé.");
        }

        PlayerHero hero = optionalHero.get();
        if (!hero.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Ce héros ne vous appartient pas.");
        }

        playerHeroService.unlockHero(hero);
        return ResponseEntity.ok("🔓 Héros déverrouillé.");
    }



@GetMapping("/my")
public ResponseEntity<List<PlayerHeroViewDTO>> getMyHeroes(HttpServletRequest request) {
    User user = getCurrentUser(request);
    List<PlayerHero> heroes = playerHeroService.getAllByUser(user);
    List<PlayerHeroViewDTO> result = heroes.stream()
        .map(playerHeroService::buildPlayerHeroViewDTO)
        .toList();
    return ResponseEntity.ok(result);
}

}
