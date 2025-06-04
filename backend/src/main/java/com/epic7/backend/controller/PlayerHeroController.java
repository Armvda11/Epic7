package com.epic7.backend.controller;

import com.epic7.backend.dto.PlayerHeroViewDTO;
import com.epic7.backend.dto.SkillDTO;
import com.epic7.backend.repository.model.Hero;
import com.epic7.backend.repository.model.PlayerHero;
import com.epic7.backend.repository.model.Skill;
import com.epic7.backend.repository.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.PlayerHeroService;
import com.epic7.backend.service.SkillService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
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

    private final SkillService skillService;

    /**
     * Constructeur de PlayerHeroController.
     * @param jwtUtil
     * @param authService
     * @param playerHeroService
     * @param skillService
     */
    public PlayerHeroController(JwtUtil jwtUtil, AuthService authService, PlayerHeroService playerHeroService,
            SkillService skillService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.playerHeroService = playerHeroService;
        this.skillService = skillService;
    }

    /**
     * Récupère l'utilisateur actuel à partir du token JWT dans la requête.
     * @param request Requête HTTP contenant le token JWT
     * @return        L'utilisateur actuel
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Gagne de l'expérience pour un héros spécifique du joueur.
     * 
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
     * Verrouille un héros. Empêche la vente ou la suppression du héros par le joueur.
     * @param heroId    ID du héros à verrouiller
     * @param request   Requête HTTP contenant le token JWT
     * @return        Réponse HTTP indiquant le succès ou l'échec de l'opération
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

    /**
     * Récupère tous les héros du joueur actuel.
     * @param request
     * @return
     */
    @GetMapping("/my")
    public ResponseEntity<List<PlayerHeroViewDTO>> getMyHeroes(HttpServletRequest request) {
        User user = getCurrentUser(request);
        List<PlayerHero> heroes = playerHeroService.getAllByUser(user);
        List<PlayerHeroViewDTO> result = heroes.stream()
                .map(playerHeroService::buildPlayerHeroViewDTO)
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Récupère les compétences d'un héros spécifique du joueur.
     * @param playerHeroId
     * @param request
     * @return
     */
    @GetMapping("/{playerHeroId}/skills")
    public ResponseEntity<List<SkillDTO>> getSkillsForPlayerHero(@PathVariable Long playerHeroId,
            HttpServletRequest request) {
        List<Skill> skills = skillService.getSkillsByHeroId(playerHeroId);
        return ResponseEntity.ok(skills.stream().map(skillService::toDTO).toList());
    }


    /**
     * Récupère le modèle de héros d'origine pour un héros spécifique du joueur.
     * @param playerHeroId
     * @param request
     * @return
     */
    @GetMapping("/{playerHeroId}/hero")
    public ResponseEntity<Hero> getOriginalHeroModel(@PathVariable Long playerHeroId, HttpServletRequest request) {
        User user = getCurrentUser(request);
        PlayerHero playerHero = playerHeroService.findById(playerHeroId);

        if (playerHero == null || !playerHero.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(playerHero.getHero());
    }

    @GetMapping("/user")
    public ResponseEntity<List<PlayerHeroViewDTO>> getUserHeroes(@RequestParam Long userId) {
        try {
            List<PlayerHero> playerHeroes = playerHeroService.getAllByUserId(userId);
            List<PlayerHeroViewDTO> userHeroes = playerHeroes.stream()
                    .map(playerHeroService::buildPlayerHeroViewDTO)
                    .toList();
            return ResponseEntity.ok(userHeroes);
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des héros de l'utilisateur : " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

}
