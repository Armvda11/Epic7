package com.epic7.backend.controller;

import com.epic7.backend.dto.GuildBanDTO;
import com.epic7.backend.dto.GuildDTO;
import com.epic7.backend.dto.GuildInfoDTO;
import com.epic7.backend.dto.GuildMemberDTO;
import com.epic7.backend.model.Guild;
import com.epic7.backend.model.GuildMembership;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.GuildRole;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.GuildService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Contrôleur REST pour la gestion des guildes (création, rejoindre, quitter, consulter).
 */
@RestController
@RequestMapping("/api/guilds")
public class GuildController {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final GuildService guildService;

    /**
     * Constructeur de la classe GuildController.
     *
     * @param jwtUtil      L'utilitaire JWT pour la gestion des tokens.
     * @param authService  Le service d'authentification.
     * @param guildService Le service de gestion des guildes.
     */
    public GuildController(JwtUtil jwtUtil, AuthService authService, GuildService guildService) {
        this.jwtUtil = jwtUtil;
        this.authService = authService;
        this.guildService = guildService;
    }

    /**
     * Utilitaire pour extraire l'utilisateur connecté via le token JWT dans les headers.
     *
     * @param request La requête HTTP contenant le token JWT.
     * @return L'utilisateur connecté.
     */
    private User getCurrentUser(HttpServletRequest request) {
        String token = jwtUtil.extractTokenFromHeader(request);
        String email = jwtUtil.extractEmail(token);
        return authService.getUserByEmail(email);
    }

    /**
     * Permet à l'utilisateur courant de créer une guilde.
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
     * Recherche des guildes par nom.
     */
    @GetMapping("/search")
    public ResponseEntity<List<GuildInfoDTO>> searchGuilds(@RequestParam String query) {
        List<GuildInfoDTO> results = guildService.searchGuildsByName(query);
        return ResponseEntity.ok(results);
    }

    /**
     * Récupère les informations d'une guilde par son ID.
     */
    @PostMapping("/{guildId}")
    public ResponseEntity<?> getGuildById(HttpServletRequest request, @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        GuildMembership membership = guildService.getUserMembership(user);
        boolean isMember = membership != null && membership.getGuild().getId().equals(guildId);

        try {
            if (isMember) {
                GuildDTO guildDTO = guildService.getGuildPrivateDetails(guildId, user);
                return ResponseEntity.ok(guildDTO);
            } else {
                GuildInfoDTO guildInfoDTO = guildService.getGuildPublicDetails(guildId);
                return ResponseEntity.ok(guildInfoDTO);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Récupère les informations de guilde d'un utilisateur par son ID.
     */
    @PostMapping("/member")
    public ResponseEntity<?> getGuildByMember(HttpServletRequest request, @RequestParam Long user_id) {
        try {
            // Vérifier que l'utilisateur a accès à cette guilde
            User requester = getCurrentUser(request);
            GuildMembership membership = guildService.getUserMembership(requester);
            if (membership == null || !membership.getUser().getId().equals(user_id)) {
                return ResponseEntity.status(403).body("❌ Accès non autorisé");
            }
            // Récupérer la guilde de l'utilisateur
            Optional<GuildDTO> userGuild = guildService.getUserGuildDTOById(user_id, true);
            
            if (userGuild.isPresent()) {
                return ResponseEntity.ok(userGuild.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet à l'utilisateur courant de rejoindre une guilde existante par ID.
     */
    @PostMapping("/join")
    public ResponseEntity<String> addUserToGuild(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            // Rejoindre la guilde
            guildService.joinGuild(requester, guildId);
            return ResponseEntity.ok("✅ Vous avez rejoint la guilde !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            System.err.println("Erreur lors de la tentative de rejoindre la guilde : " + e.getMessage());
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet à un utilisateur d'inviter un autre utilisateur dans sa guilde.
     * @param request
     * @param userId
     * @return
     */

    @PostMapping("/invite")
    public ResponseEntity<String> inviteUserToGuild(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.inviteUserToGuild(requester, userId);
            return ResponseEntity.ok("✅ Invitation envoyée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet d'accepter la demande d'invitation à une guilde.
     * @param request
     * @param guildId
     * @return
     */
    @PostMapping("/accept_invite")
    public ResponseEntity<String> acceptGuildInvite(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.acceptGuildInvite(requester, guildId);
            return ResponseEntity.ok("✅ Invitation acceptée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet de refuser une invitation à une guilde.
     */
    @PostMapping("/decline_invite")
    public ResponseEntity<String> declineGuildInvite(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.declineGuildInvite(requester, guildId);
            return ResponseEntity.ok("✅ Invitation refusée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet d'accepter une demande d'adhésion à une guilde.
     * @param request
     * @param userId
     * @return
     */
    @PostMapping("/accept_request")
    public ResponseEntity<String> acceptGuildRequest(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.acceptGuildRequest(requester, userId);
            return ResponseEntity.ok("✅ Demande acceptée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet de refuser une demande d'adhésion à une guilde.
     * @param request
     * @param userId
     * @return
     */
    @PostMapping("/decline_request")
    public ResponseEntity<String> declineGuildRequest(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.declineGuildRequest(requester, userId);
            return ResponseEntity.ok("✅ Demande refusée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet de supprimer un utilisateur d'une guilde.
     */
    @PostMapping("/remove")
    public ResponseEntity<String> removeUserFromGuild(HttpServletRequest request,
                                            @RequestParam(required = false) Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            // Si un ID est fourni, c'est une expulsion
            if (userId != null) {
                // userId could be either user ID or membership ID, handle in service
                guildService.kickGuildMember(requester.getId(), userId);
                return ResponseEntity.ok("✅ Le membre a été expulsé de la guilde.");
            } else {
                // Quitter soi-même
                guildService.leaveGuild(requester);
                return ResponseEntity.ok("👋 Vous avez quitté la guilde.");
            }
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet au chef de guilde de changer le rôle d'un membre.
     */
    @PostMapping("/change_role")
    public ResponseEntity<String> changeMemberRole(
            HttpServletRequest request, 
            @RequestParam Long memberId,
            @RequestParam String role) {
        User user = getCurrentUser(request);
        GuildRole newRole = GuildRole.fromString(role);
        try {
            // memberId could be either user ID or membership ID, handle in service
            guildService.changeGuildMemberRole(user.getId(), memberId, newRole);
            return ResponseEntity.ok("✅ Le rôle du membre a été modifié.");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Récupère la guilde actuelle de l'utilisateur.
     */
    @GetMapping("/user")
    public ResponseEntity<?> getUserGuild(HttpServletRequest request) {
        User user = getCurrentUser(request);
        Optional<GuildDTO> userGuild = guildService.getUserGuildDTO(user, true);
        
        if (userGuild.isPresent()) {
            return ResponseEntity.ok(userGuild.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Liste tous les membres d'une guilde donnée.
     */
    @GetMapping("/{guildId}/members")
    public ResponseEntity<?> getGuildMembers(HttpServletRequest request, @PathVariable Long guildId) {
        try {
            List<GuildMembership> memberships = guildService.getMembers(guildId);
            
            // Convertir les membres en DTOs
            List<GuildMemberDTO> memberDTOs = memberships.stream()
                    .map(GuildMemberDTO::fromEntity)
                    .toList();
            
            return ResponseEntity.ok(memberDTOs);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Liste tous les membres d'une guilde donnée avec informations détaillées.
     */
    @GetMapping("/{guildId}/members/detailed")
    public ResponseEntity<?> getDetailedGuildMembers(HttpServletRequest request, @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            // Vérifier que l'utilisateur a accès à cette guilde
            GuildMembership membership = guildService.getUserMembership(user);
            
            // Si l'utilisateur est membre de cette guilde ou admin, il peut voir les détails
            boolean hasAccess = (membership != null && membership.getGuild().getId().equals(guildId));
            
            if (!hasAccess) {
                return ResponseEntity.status(403).body("❌ Accès non autorisé");
            }
            
            List<GuildMemberDTO> members = guildService.getAllGuildMembersByGuildId(guildId, true);
            return ResponseEntity.ok(members);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Met à jour la description d'une guilde.
     */
    @PostMapping("/{guildId}/description")
    public ResponseEntity<?> updateGuildDescription(HttpServletRequest request,
                                            @PathVariable Long guildId,
                                            @RequestParam String description) {
        User user = getCurrentUser(request);
        try {
            guildService.updateGuildDescription(user.getId(), guildId, description);
            return ResponseEntity.ok("✅ Description mise à jour avec succès");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
    
    /**
     * Supprime une guilde (uniquement par le leader).
     */
    @DeleteMapping("/{guildId}")
    public ResponseEntity<String> deleteGuild(HttpServletRequest request,
                                        @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            guildService.deleteGuild(user.getId(), guildId);
            return ResponseEntity.ok("✅ Guilde supprimée avec succès");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
    
    /**
     * Bannit un utilisateur d'une guilde.
     */
    @PostMapping("/{guildId}/ban")
    public ResponseEntity<?> banUserFromGuild(HttpServletRequest request,
                                        @PathVariable Long guildId,
                                        @RequestParam Long userId,
                                        @RequestParam(required = false) String reason) {
        User user = getCurrentUser(request);
        try {
            // Check if userId is actually a membership ID and handle accordingly
            GuildBanDTO ban = guildService.banUserFromGuild(user.getId(), userId, guildId, reason);
            return ResponseEntity.ok(ban);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
    
    /**
     * Liste les utilisateurs bannis d'une guilde.
     */
    @GetMapping("/{guildId}/bans")
    public ResponseEntity<?> getGuildBannedUsers(HttpServletRequest request,
                                        @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            List<GuildBanDTO> bans = guildService.getGuildBannedUsers(user.getId(), guildId);
            return ResponseEntity.ok(bans);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
    
    /**
     * Débannit un utilisateur d'une guilde.
     */
    @PostMapping("/{guildId}/unban")
    public ResponseEntity<String> unbanUserFromGuild(HttpServletRequest request,
                                                @PathVariable Long guildId,
                                                @RequestParam Long userId) {
        User user = getCurrentUser(request);
        try {
            guildService.unbanUserFromGuild(user.getId(), userId, guildId);
            return ResponseEntity.ok("✅ Utilisateur débanni avec succès");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
    
    /**
     * Change le statut ouvert/fermé d'une guilde.
     */
    @PostMapping("/{guildId}/status")
    public ResponseEntity<String> updateGuildOpenStatus(HttpServletRequest request,
                                                    @PathVariable Long guildId,
                                                    @RequestParam boolean isOpen) {
        User user = getCurrentUser(request);
        try {
            guildService.updateGuildOpenStatus(user.getId(), guildId, isOpen);
            String status = isOpen ? "ouverte" : "fermée";
            return ResponseEntity.ok("✅ La guilde est maintenant " + status);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }

    /**
     * Permet à un utilisateur de faire une demande pour rejoindre une guilde.
     */
    @PostMapping("/request_join")
    public ResponseEntity<String> requestToJoinGuild(HttpServletRequest request,
                                        @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.requestToJoinGuild(requester, guildId);
            return ResponseEntity.ok("✅ Demande d'adhésion envoyée !");
        } catch (IllegalArgumentException | IllegalStateException e) {
            System.err.println("Erreur lors de la tentative de rejoindre la guilde : " + e.getMessage());
            return ResponseEntity.badRequest().body("❌ " + e.getMessage());
        }
    }
}
