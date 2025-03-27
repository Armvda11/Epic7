package com.epic7.backend.controller;

import com.epic7.backend.model.Guild;
import com.epic7.backend.model.GuildMembership;
import com.epic7.backend.model.User;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.GuildService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur REST pour la gestion des guildes (création, rejoindre, quitter, consulter).
 */
@RestController
@RequestMapping("/api/guild")
public class GuildController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final GuildService guildService;

    public GuildController(JwtUtil jwtUtil, AuthService authService, GuildService guildService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.guildService = guildService;
    }

    /**
     * Récupère l'utilisateur connecté à partir du token JWT dans la requête.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Création d’une nouvelle guilde par l'utilisateur courant (qui en devient le leader).
     */
    @PostMapping("/create")
    public ResponseEntity<?> createGuild(HttpServletRequest request,
                                         @RequestParam String name,
                                         @RequestParam(required = false) String description) {
        User user = getCurrentUser(request);
        try {
            Guild guild = guildService.createGuild(user, name, description);
            return ResponseEntity.ok("✅ Guilde créée : " + guild.getName());
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet à l'utilisateur courant de rejoindre une guilde existante par ID.
     */
    @PostMapping("/{guildId}/join")
    public ResponseEntity<String> joinGuild(HttpServletRequest request,
                                            @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            guildService.joinGuild(user, guildId);
            return ResponseEntity.ok("✅ Vous avez rejoint la guilde !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet à l'utilisateur de quitter sa guilde actuelle.
     */
    @PostMapping("/leave")
    public ResponseEntity<String> leaveGuild(HttpServletRequest request) {
        User user = getCurrentUser(request);
        try {
            guildService.leaveGuild(user);
            return ResponseEntity.ok("👋 Vous avez quitté la guilde.");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Récupère la guilde actuelle de l'utilisateur.
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyGuild(HttpServletRequest request) {
        User user = getCurrentUser(request);
        return guildService.getGuildOfUser(user)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok("ℹ️ Vous n'appartenez à aucune guilde."));
    }

    /**
     * Liste tous les membres d'une guilde donnée.
     */
    @GetMapping("/{guildId}/members")
    public ResponseEntity<?> getGuildMembers(@PathVariable Long guildId) {
        try {
            List<GuildMembership> members = guildService.getMembers(guildId);
            return ResponseEntity.ok(members);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
}
