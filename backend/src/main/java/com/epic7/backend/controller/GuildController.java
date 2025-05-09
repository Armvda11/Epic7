package com.epic7.backend.controller;


import com.epic7.backend.dto.GuildBanDTO;
import com.epic7.backend.dto.GuildDTO;
import com.epic7.backend.dto.GuildInfoDTO;
import com.epic7.backend.dto.GuildMemberDTO;
import com.epic7.backend.dto.ApiResponseDTO;
import com.epic7.backend.model.Guild;
import com.epic7.backend.model.GuildMembership;
import com.epic7.backend.model.User;
import com.epic7.backend.model.enums.GuildRole;
import com.epic7.backend.service.AuthService;
import com.epic7.backend.service.GuildService;
import com.epic7.backend.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
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

    // Error codes constants
    private static final String ERROR_INVALID_INPUT = "GUILD_INVALID_INPUT";
    private static final String ERROR_ALREADY_IN_GUILD = "GUILD_ALREADY_MEMBER";
    private static final String ERROR_NOT_FOUND = "GUILD_NOT_FOUND";
    private static final String ERROR_PERMISSION_DENIED = "GUILD_PERMISSION_DENIED";
    private static final String ERROR_USER_BANNED = "GUILD_USER_BANNED";
    private static final String ERROR_GENERIC = "GUILD_ERROR";
    private static final String ERROR_SERVER = "INTERNAL_SERVER_ERROR"; // Add a specific code for server errors

    // Success code constants
    private static final String SUCCESS_CREATED = "GUILD_CREATED";
    private static final String SUCCESS_JOINED = "GUILD_JOINED";
    private static final String SUCCESS_LEFT = "GUILD_LEFT";
    private static final String SUCCESS_UPDATED = "GUILD_UPDATED";
    private static final String SUCCESS_DELETED = "GUILD_DELETED";
    private static final String SUCCESS_MEMBER_UPDATED = "GUILD_MEMBER_UPDATED";
    private static final String SUCCESS_REQUEST_SENT = "GUILD_REQUEST_SENT";
    private static final String SUCCESS_REQUEST_ACCEPTED = "GUILD_REQUEST_ACCEPTED";
    private static final String SUCCESS_REQUEST_DECLINED = "GUILD_REQUEST_DECLINED";
    private static final String SUCCESS_INVITE_ACCEPTED = "GUILD_INVITE_ACCEPTED";
    private static final String SUCCESS_INVITE_DECLINED = "GUILD_INVITE_DECLINED";
    private static final String SUCCESS_USER_UNBANNED = "GUILD_USER_UNBANNED";
    private static final String SUCCESS_STATUS_UPDATED = "GUILD_STATUS_UPDATED";
    private static final String SUCCESS_DATA_RETRIEVED = "GUILD_DATA_RETRIEVED";

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
    public ResponseEntity<ApiResponseDTO> createGuild(HttpServletRequest request,
                                        @RequestParam String name,
                                        @RequestParam(required = false) String description) {
        User user = getCurrentUser(request);
        try {
            Guild guild = guildService.createGuild(user, name, description);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_CREATED, 
                "✅ Guilde créée : " + guild.getName(), 
                guild.getId()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_ALREADY_IN_GUILD, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la création de la guilde."));
        }
    }

    /**
     * Recherche des guildes par nom.
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponseDTO> searchGuilds(@RequestParam String query) {
        try {
            List<GuildInfoDTO> results = guildService.searchGuildsByName(query);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Recherche effectuée avec succès",
                results
            ));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la recherche de guildes."));
        }
    }

    /**
     * Récupère les informations d'une guilde par son ID.
     */
    @PostMapping("/{guildId}")
    public ResponseEntity<ApiResponseDTO> getGuildById(HttpServletRequest request, @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        GuildMembership membership = guildService.getUserMembership(user);
        boolean isMember = membership != null && membership.getGuild().getId().equals(guildId);

        try {
            if (isMember) {
                GuildDTO guildDTO = guildService.getGuildPrivateDetails(guildId, user);
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED, 
                    "Détails de la guilde récupérés avec succès", 
                    guildDTO
                ));
            } else {
                GuildInfoDTO guildInfoDTO = guildService.getGuildPublicDetails(guildId);
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED, 
                    "Informations de la guilde récupérées avec succès", 
                    guildInfoDTO
                ));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des détails de la guilde."));
        }
    }

    /**
     * Récupère les informations de guilde d'un utilisateur par son ID.
     */
    @PostMapping("/member")
    public ResponseEntity<ApiResponseDTO> getGuildByMember(HttpServletRequest request, @RequestParam Long user_id) {
        try {
            // Vérifier que l'utilisateur a accès à cette guilde
            User requester = getCurrentUser(request);
            GuildMembership membership = guildService.getUserMembership(requester);
            if (membership == null || !membership.getUser().getId().equals(user_id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, "Accès non autorisé"));
            }
            // Récupérer la guilde de l'utilisateur
            Optional<GuildDTO> userGuild = guildService.getUserGuildDTOById(user_id, true);
            
            if (userGuild.isPresent()) {
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED,
                    "Informations de la guilde récupérées avec succès",
                    userGuild.get()
                ));
            } else {
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED,
                    "L'utilisateur n'appartient à aucune guilde",
                    null
                ));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération de la guilde du membre."));
        }
    }

    /**
     * Permet à l'utilisateur courant de rejoindre une guilde ouverte existante par ID.
     */
    @PostMapping("/join")
    public ResponseEntity<ApiResponseDTO> addUserToGuild(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            // Rejoindre la guilde
            guildService.joinGuild(requester, guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_JOINED,
                "✅ Vous avez rejoint la guilde !"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            // Determine specific error type based on message
            String errorCode = e.getMessage().contains("banni") ? ERROR_USER_BANNED : 
                            e.getMessage().contains("déjà membre") ? ERROR_ALREADY_IN_GUILD : 
                            ERROR_GENERIC;
            
            System.err.println("Erreur lors de la tentative de rejoindre la guilde : " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(errorCode, e.getMessage()));
        } catch (Exception e) {
            System.err.println("Erreur inattendue : " + e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la tentative de rejoindre la guilde."));
        }
    }

    /**
     * Permet à un utilisateur d'inviter un autre utilisateur dans sa guilde.
     * @param request
     * @param userId
     * @return
     */

    @PostMapping("/invite")
    public ResponseEntity<?> inviteUserToGuild(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.inviteUserToGuild(requester, userId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_REQUEST_SENT,
                "✅ Invitation envoyée !"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }

    /**
     * Permet d'accepter la demande d'invitation à une guilde.
     * @param request
     * @param guildId
     * @return
     */
    @PostMapping("/accept_invite")
    public ResponseEntity<?> acceptGuildInvite(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.acceptGuildInvite(requester, guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_INVITE_ACCEPTED,
                "✅ Invitation acceptée!"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }

    /**
     * Permet de refuser une invitation à une guilde.
     */
    @PostMapping("/decline_invite")
    public ResponseEntity<?> declineGuildInvite(HttpServletRequest request,
                                            @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.declineGuildInvite(requester, guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_INVITE_DECLINED,
                "✅ Invitation refusée!"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }

    /**
     * Permet d'accepter une demande d'adhésion à une guilde.
     * @param request
     * @param userId
     * @return
     */
    @PostMapping("/accept_request")
    public ResponseEntity<?> acceptGuildRequest(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.acceptGuildRequest(requester, userId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_REQUEST_ACCEPTED,
                "✅ Demande acceptée!"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }

    /**
     * Permet de refuser une demande d'adhésion à une guilde.
     * @param request
     * @param userId
     * @return
     */
    @PostMapping("/decline_request")
    public ResponseEntity<?> declineGuildRequest(HttpServletRequest request,
                                            @RequestParam Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.declineGuildRequest(requester, userId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_REQUEST_DECLINED,
                "✅ Demande refusée!"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }

    /**
     * Permet de supprimer un utilisateur d'une guilde.
     */
    @PostMapping("/remove")
    public ResponseEntity<?> removeUserFromGuild(HttpServletRequest request,
                                            @RequestParam(required = false) Long userId) {
        User requester = getCurrentUser(request);
        
        try {
            // Si un ID est fourni, c'est une expulsion
            if (userId != null) {
                // userId could be either user ID or membership ID, handle in service
                guildService.kickGuildMember(requester.getId(), userId);
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_MEMBER_UPDATED,
                    "✅ Le membre a été expulsé de la guilde."
                ));
            } else {
                // Quitter soi-même
                guildService.leaveGuild(requester);
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_LEFT,
                    "👋 Vous avez quitté la guilde."
                ));
            }
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la tentative de quitter/expulser de la guilde."));
        }
    }

    /**
     * Permet au chef de guilde de changer le rôle d'un membre.
     */
    @PostMapping("/change_role")
    public ResponseEntity<?> changeMemberRole(
            HttpServletRequest request, 
            @RequestParam Long memberId,
            @RequestParam String role) {
        User user = getCurrentUser(request);
        GuildRole newRole;
        
        try {
            newRole = GuildRole.fromString(role);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, "Rôle invalide: " + role));
        }
        
        try {
            // memberId could be either user ID or membership ID, handle in service
            guildService.changeGuildMemberRole(user.getId(), memberId, newRole);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_MEMBER_UPDATED,
                "✅ Le rôle du membre a été modifié."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la modification du rôle."));
        }
    }

    /**
     * Récupère la guilde actuelle de l'utilisateur.
     */
    @GetMapping("/user")
    public ResponseEntity<ApiResponseDTO> getUserGuild(HttpServletRequest request) {
        User user = getCurrentUser(request);
        try {
            Optional<GuildDTO> userGuild = guildService.getUserGuildDTO(user, true);
            
            if (userGuild.isPresent()) {
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED,
                    "Guilde de l'utilisateur récupérée avec succès",
                    userGuild.get()
                ));
            } else {
                return ResponseEntity.ok(ApiResponseDTO.success(
                    SUCCESS_DATA_RETRIEVED,
                    "L'utilisateur n'appartient à aucune guilde",
                    null
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération de la guilde."));
        }
    }

    /**
     * Liste tous les membres d'une guilde donnée.
     */
    @GetMapping("/{guildId}/members")
    public ResponseEntity<ApiResponseDTO> getGuildMembers(HttpServletRequest request, @PathVariable Long guildId) {
        try {
            List<GuildMembership> memberships = guildService.getMembers(guildId);
            
            // Convertir les membres en DTOs
            List<GuildMemberDTO> memberDTOs = memberships.stream()
                    .map(GuildMemberDTO::fromEntity)
                    .toList();
            
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Liste des membres récupérée avec succès",
                memberDTOs
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des membres de la guilde."));
        }
    }

    /**
     * Liste tous les membres d'une guilde donnée avec informations détaillées.
     */
    @GetMapping("/{guildId}/members/detailed")
    public ResponseEntity<ApiResponseDTO> getDetailedGuildMembers(HttpServletRequest request, @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            // Vérifier que l'utilisateur a accès à cette guilde
            GuildMembership membership = guildService.getUserMembership(user);
            
            // Si l'utilisateur est membre de cette guilde ou admin, il peut voir les détails
            boolean hasAccess = (membership != null && membership.getGuild().getId().equals(guildId));
            
            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, "Accès non autorisé"));
            }
            
            List<GuildMemberDTO> members = guildService.getAllGuildMembersByGuildId(guildId, true);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Liste détaillée des membres récupérée avec succès",
                members
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des membres de la guilde."));
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
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_UPDATED,
                "✅ Description mise à jour avec succès"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_GENERIC, "Une erreur est survenue lors de la mise à jour de la description."));
        }
    }
    
    /**
     * Supprime une guilde (uniquement par le leader).
     */
    @DeleteMapping("/{guildId}")
    public ResponseEntity<?> deleteGuild(HttpServletRequest request,
                                        @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            guildService.deleteGuild(user.getId(), guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DELETED,
                "✅ Guilde supprimée avec succès"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_GENERIC, "Une erreur est survenue lors de la suppression de la guilde."));
        }
    }
    
    /**
     * Bannit un utilisateur d'une guilde.
     */
    @PostMapping("/{guildId}/ban")
    public ResponseEntity<ApiResponseDTO> banUserFromGuild(HttpServletRequest request,
                                        @PathVariable Long guildId,
                                        @RequestParam Long userId,
                                        @RequestParam(required = false) String reason) {
        User user = getCurrentUser(request);
        try {
            // Check if userId is actually a membership ID and handle accordingly
            GuildBanDTO ban = guildService.banUserFromGuild(user.getId(), userId, guildId, reason);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_MEMBER_UPDATED,
                "Utilisateur banni avec succès",
                ban
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            // Log the actual exception for debugging
            System.err.println("Error banning user: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors du bannissement de l'utilisateur."));
        }
    }
    
    /**
     * Liste les utilisateurs bannis d'une guilde.
     */
    @GetMapping("/{guildId}/bans")
    public ResponseEntity<ApiResponseDTO> getGuildBannedUsers(HttpServletRequest request,
                                        @PathVariable Long guildId) {
        User user = getCurrentUser(request);
        try {
            List<GuildBanDTO> bans = guildService.getGuildBannedUsers(user.getId(), guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Liste des utilisateurs bannis récupérée avec succès",
                bans
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }
    
    /**
     * Débannit un utilisateur d'une guilde.
     */
    @PostMapping("/{guildId}/unban")
    public ResponseEntity<?> unbanUserFromGuild(HttpServletRequest request,
                                                @PathVariable Long guildId,
                                                @RequestParam Long userId) {
        User user = getCurrentUser(request);
        try {
            guildService.unbanUserFromGuild(user.getId(), userId, guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_USER_UNBANNED,
                "✅ Utilisateur débanni avec succès"
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        }
    }
    
    /**
     * Change le statut ouvert/fermé d'une guilde.
     */
    @PostMapping("/{guildId}/status")
    public ResponseEntity<?> updateGuildOpenStatus(HttpServletRequest request,
                                                    @PathVariable Long guildId,
                                                    @RequestParam boolean isOpen) {
        User user = getCurrentUser(request);
        try {
            guildService.updateGuildOpenStatus(user.getId(), guildId, isOpen);
            String status = isOpen ? "ouverte" : "fermée";
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_STATUS_UPDATED,
                "✅ La guilde est maintenant " + status
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_NOT_FOUND, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_PERMISSION_DENIED, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la modification du statut de la guilde."));
        }
    }

    /**
     * Permet à un utilisateur de faire une demande pour rejoindre une guilde.
     */
    @PostMapping("/request_join")
    public ResponseEntity<?> requestToJoinGuild(HttpServletRequest request,
                                        @RequestParam Long guildId) {
        User requester = getCurrentUser(request);
        
        try {
            guildService.requestToJoinGuild(requester, guildId);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_REQUEST_SENT,
                "✅ Demande d'adhésion envoyée !"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(ERROR_INVALID_INPUT, e.getMessage()));
        } catch (IllegalStateException e) {
            String errorCode = e.getMessage().contains("banni") ? ERROR_USER_BANNED : ERROR_ALREADY_IN_GUILD;
            System.err.println("Erreur lors de la tentative de rejoindre la guilde : " + e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponseDTO.error(errorCode, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de l'envoi de la demande d'adhésion."));
        }
    }

    /**
     * Récupère les guildes les plus récemment créées.
     */
    @GetMapping("/recent")
    public ResponseEntity<ApiResponseDTO> getRecentGuilds(@RequestParam(defaultValue = "10") int limit) {
        try {
            List<GuildInfoDTO> recentGuilds = guildService.getRecentGuilds(limit);
            return ResponseEntity.ok(ApiResponseDTO.success(
                SUCCESS_DATA_RETRIEVED,
                "Guildes récentes récupérées avec succès",
                recentGuilds
            ));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponseDTO.error(ERROR_SERVER, "Une erreur est survenue lors de la récupération des guildes récentes."));
        }
    }
}
