package com.epic7.backend.service;

import com.epic7.backend.dto.GuildBanDTO;
import com.epic7.backend.dto.GuildDTO;
import com.epic7.backend.dto.GuildInfoDTO;
import com.epic7.backend.dto.GuildMemberDTO;
import com.epic7.backend.model.*;
import com.epic7.backend.model.enums.GuildRole;
import com.epic7.backend.repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.annotation.Lazy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.ArrayList;

/**
 * Service de gestion des guildes.
 * Ce service gère la création, l'adhésion et la sortie des guildes pour les utilisateurs.
 * Il permet également de récupérer les membres d'une guilde et de vérifier l'appartenance d'un utilisateur à une guilde.
 * Il permet également de rechercher des guildes par nom, de récupérer les informations détaillées d'une guilde,
 * d'expulser un membre de la guilde et de changer le rôle d'un membre dans la guilde.
 * Il permet également de bannir un utilisateur d'une guilde, de modifier la description d'une guilde,
 * de supprimer une guilde, de récupérer la liste des utilisateurs bannis d'une guilde,
 * de débannir un utilisateur d'une guilde, de changer le statut ouvert/fermé d'une guilde,
 * de trier les membres de la guilde par contributions et d'ajouter des points de contribution à un membre de la guilde.
 * Il permet également d'inviter un utilisateur à rejoindre une guilde, d'accepter ou de refuser une invitation,
 * d'accepter ou de refuser une demande d'adhésion à une guilde.
 * @authors hermas, corentin
 */
@Service
public class GuildService {

    private final GuildRepository guildRepository;
    private final GuildMembershipRepository guildMembershipRepository;
    private final UserRepository userRepository;
    private final GuildBanRepository guildBanRepository;
    private final MessageService messageService;
    private final ChatService chatService;

    // Constructor with @Lazy for ChatService to break circular dependency
    public GuildService(
            GuildRepository guildRepository,
            GuildMembershipRepository guildMembershipRepository,
            UserRepository userRepository,
            GuildBanRepository guildBanRepository,
            MessageService messageService,
            @Lazy ChatService chatService) {
        this.guildRepository = guildRepository;
        this.guildMembershipRepository = guildMembershipRepository;
        this.userRepository = userRepository;
        this.guildBanRepository = guildBanRepository;
        this.messageService = messageService;
        this.chatService = chatService;
    }

    /**
     * Crée une nouvelle guilde.
     * @param user        L'utilisateur qui crée la guilde.
     * @param name        Le nom de la guilde.
     * @param description La description de la guilde.
     * @return La guilde créée.
     */
    @Transactional
    public Guild createGuild(User user, String name, String description) {
        // Vérifier si l'utilisateur appartient déjà à une guilde
        if (getGuildOfUser(user).isPresent()) {
            throw new IllegalStateException("L'utilisateur appartient déjà à une guilde.");
        }

        // Vérifier si le nom de la guilde est déjà utilisé
        if (guildRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Ce nom de guilde est déjà utilisé.");
        }

        // Créer la guilde
        Guild guild = new Guild();
        guild.setName(name);
        guild.setDescription(description);
        guild.setChatAdminRole(GuildRole.LEADER);
        guild = guildRepository.save(guild);

        // Créer l'adhésion de l'utilisateur à la guilde
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole(GuildRole.LEADER); // L'utilisateur devient le leader de la guilde
        membership.setJoinDate(Instant.now());

        // On ajoute la guilde à l'utilisateur
        user.setGuildMembership(membership);

        // On crée un chat lié à la guilde
        // chatService.createGuildChatRoom(guild.getId());

        // Enregistrer l'adhésion
        guildMembershipRepository.save(membership);
        userRepository.save(user);
        return guild;
    }

    /**
     * L'utilisateur rejoint une guilde.
     * @param user    L'utilisateur qui rejoint la guilde.
     * @param guildId L'identifiant de la guilde.
     */
    @Transactional
    public void joinGuild(User user, Long guildId) {
        // Vérifier si l'utilisateur appartient déjà à une guilde
        if (getGuildOfUser(user).isPresent()) {
            throw new IllegalStateException("L'utilisateur est déjà dans une guilde.");
        }
        // Vérifier si la guilde existe
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));

        // Vérifier si l'utilisateur est banni de la guilde
        if (guildBanRepository.findByGuildIdAndUserId(guildId, user.getId()).isPresent()) {
            throw new IllegalStateException("L'utilisateur est banni de cette guilde.");
        }

        // Vérifier si la guilde est pleine
        if (guild.getMembers().size() >= guild.getMaxMembers()) {
            throw new IllegalStateException("La guilde est pleine.");
        }
        // Vérifier si la guilde est ouverte
        if (guild.isOpen() == false) {
            throw new IllegalStateException("La guilde est fermée.");
        }

        // Générer l'adhésion de l'utilisateur à la guilde
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole(GuildRole.NOUVEAU); // L'utilisateur devient un nouveau membre
        membership.setJoinDate(Instant.now());

        guild.addMember(membership); // Ajout à la liste des membres de la guilde
        user.setGuildMembership(membership); //  de l'utilisateur
    }

    /**
     * L'utilisateur quitte la guilde.
     * @param user L'utilisateur qui quitte la guilde.
     */
    @Transactional
    public void leaveGuild(User user) {
        // Vérifier si l'utilisateur appartient à une guilde
        GuildMembership memberships = guildMembershipRepository.findByUser(user);
        if (memberships == null) {
            throw new IllegalStateException("L'utilisateur n'appartient à aucune guilde.");
        }
        // Vérifier si l'utilisateur est le leader de la guilde
        if (memberships.getRole().hasAtLeastRole(GuildRole.LEADER)) {
            throw new IllegalStateException("Le leader de la guilde ne peut pas quitter la guilde sans la dissoudre.");
        }

        GuildMembership currentMembership =  user.getGuildMembership();

        currentMembership.getGuild().removeMember(currentMembership); // Retirer l'utilisateur de la guilde
        user.setGuildMembership(null); // Supprimer l'adhésion de l'utilisateur
    }

    /** 
     * Récupère une guilde avec son Id 
     * @param guildId L'identifiant de la guilde à récupérer.
     * @return La guilde correspondante, ou une valeur vide si aucune guilde ne correspond.
     */
    @Transactional(readOnly = true)
    public Optional<Guild> getGuildById(Long guildId) {
        return guildRepository.findById(guildId);
    }
    /**
     * Récupère la guilde à laquelle appartient l'utilisateur.
     * @param user L'utilisateur dont on veut récupérer la guilde.
     * @return La guilde de l'utilisateur, ou une valeur vide si l'utilisateur n'appartient à aucune guilde.
     */
    @Transactional(readOnly = true)
    public Optional<Guild> getGuildOfUser(User user) {
        // Vérifier si l'utilisateur appartient à une guilde
        GuildMembership membership = user.getGuildMembership();
        
        if (membership == null) {
            // Si l'utilisateur n'appartient à aucune guilde, retourner une valeur vide
            return Optional.empty();
        } else {
            // Sinon, retourner la guilde
            return Optional.of(membership.getGuild());
        }
    }

    /**
     * Récupère tous les membres d'une guilde.
     * @param guildId L'identifiant de la guilde.
     * @return La liste des membres de la guilde.
     */
    @Transactional(readOnly = true)
    public List<GuildMembership> getMembers(Long guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        return guild.getMembers();
    }

    /**
     * Récupère tous les membres d'une guilde via son nom.
     * @param guildName Le nom de la guilde.
     * @return La liste des membres de la guilde.
     */
    @Transactional(readOnly = true)
    public List<GuildMembership> getMembers(String guildName) {
        Guild guild = guildRepository.findByName(guildName)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        return guild.getMembers();
    }

    /**
     * Vérifie si l'utilisateur est membre d'une guilde spécifique.
     * @param user    L'utilisateur à vérifier.
     * @param guildId L'identifiant de la guilde.
     * @return true si l'utilisateur est membre de la guilde, false sinon.
     */
    public boolean isMemberOfGuild(User user, Long guildId) {
        return guildMembershipRepository.findByUserIdAndGuildId(user.getId(), guildId).isPresent();
    }

    /**
     * Vérifie si l'utilisateur est membre d'une guilde spécifique via son nom.
     * @param user        L'utilisateur à vérifier.
     * @param guildName   Le nom de la guilde.
     * @return true si l'utilisateur est membre de la guilde, false sinon.
     */
    public boolean isMemberOfGuild(User user, String guildName) {
        Guild guild = guildRepository.findByName(guildName)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        return guildMembershipRepository.findByUserIdAndGuildId(user.getId(), guild.getId()).isPresent();
    }

    /**
     * Vérifie si un utilisateur est membre d'une guilde spécifique en utilisant leurs identifiants.
     * @param userId L'identifiant de l'utilisateur à vérifier.
     * @param guildId L'identifiant de la guilde.
     * @return true si l'utilisateur est membre de la guilde, false sinon.
     */
    public boolean isUserInGuild(Long userId, Long guildId) {
        return guildMembershipRepository.findByUserIdAndGuildId(userId, guildId).isPresent();
    }

    /**
     * Recherche des guildes par nom.
     * @param query Le nom ou partie du nom à rechercher.
     * @return Une liste de DTOs d'informations de base sur les guildes.
     */
    @Transactional(readOnly = true)
    public List<GuildInfoDTO> searchGuildsByName(String query) {
        List<Guild> guilds = guildRepository.searchByNameContaining(query);
        return guilds.stream()
                .map(GuildInfoDTO::fromEntity)
                .collect(Collectors.toList());
    }
    /**
     * Récupère les informations publiques d'une guilde par son ID.
     * @param guildId L'ID de la guilde à récupérer.
     * @return Un DTO avec les informations publiques de la guilde.
     */
    @Transactional(readOnly = true)
    public GuildInfoDTO getGuildPublicDetails(Long guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        // Retourner les informations publiques de la guilde
        return GuildInfoDTO.fromEntity(guild);
    }
    /**
     * Récupère les informations détaillées d'une guilde par son ID.
     * @param guildId L'ID de la guilde à récupérer.
     * @param user L'utilisateur qui fait la demande.
     * @return Un DTO avec les détails de la guilde.
     */
    @Transactional(readOnly = true)
    public GuildDTO getGuildPrivateDetails(Long guildId, User user) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        // Vérifier si l'utilisateur est membre de la guilde
        if (user.getGuildMembership() != null && user.getGuildMembership().getGuild().getId().equals(guildId)) {
            // Si l'utilisateur est membre, retourner les détails de la guilde.
            return GuildDTO.fromEntity(guild, true);
        } else {
            // Si l'utilisateur n'est pas membre, retourner les informations publiques de la guilde.
            return GuildDTO.fromEntity(guild, false);
        }
    }

    /**
     * Récupère un DTO complet pour la guilde de l'utilisateur.
     * @param user L'utilisateur dont on veut récupérer la guilde.
     * @return DTO avec les informations complètes de la guilde et le rôle de l'utilisateur.
     */
    @Transactional(readOnly = true)
    public Optional<GuildDTO> getUserGuildDTO(User user, boolean isMember) {
        // Vérifier si l'utilisateur appartient à une guilde
        GuildMembership membership = guildMembershipRepository.findByUser(user);
        if (membership == null) {
            return Optional.empty();
        }
        
        Guild guild = membership.getGuild();
        
        // Créer le DTO avec le rôle de l'utilisateur
        GuildDTO dto = GuildDTO.fromEntity(guild, isMember);
        dto.setUserRole(membership.getRole().name());
        
        return Optional.of(dto);
    }

    /**
     * Expulse un membre de la guilde.
     * @param guildAdminId L'ID de l'utilisateur qui est leader/conseiller et qui expulse.
     * @param memberId L'ID du membre à expulser.
     */
    @Transactional
    public void kickGuildMember(Long guildAdminId, Long memberId) {
        User guildAdmin = userRepository.findById(guildAdminId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur guildAdmin introuvable"));
        
        User memberToKick = userRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Membre à expulser introuvable"));
        
        GuildMembership guildAdminMembership = guildMembershipRepository.findByUser(guildAdmin);
        if (guildAdminMembership == null) {
            throw new IllegalStateException("L'utilisateur n'appartient à aucune guilde.");
        }
        
        // Vérifier si l'utilisateur est leader ou conseiller
        GuildRole guildAdminRole = guildAdminMembership.getRole();
        if (!guildAdminRole.hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour expulser un membre.");
        }
        
        Guild guild = guildAdminMembership.getGuild();
        
        // Vérifier si le membre à expulser est dans la même guilde
        GuildMembership membershipToRemove = guildMembershipRepository.findByUser(memberToKick);
        if (membershipToRemove == null || !membershipToRemove.getGuild().getId().equals(guild.getId())) {
            throw new IllegalStateException("Le membre à expulser n'est pas dans votre guilde !");
        }
        
        // Un rôle ne permet pas d'expulser quelqu'un de même rang ou supérieur
        if (membershipToRemove.getRole().hasAtLeastRole(guildAdminRole)) {
            throw new IllegalStateException("Vous ne pouvez pas expulser un membre de rang égal ou supérieur au vôtre.");
        }
        
        // Supprimer l'adhésion
        guild.removeMember(membershipToRemove);
        memberToKick.setGuildMembership(null);
        guildMembershipRepository.delete(membershipToRemove);
        userRepository.save(memberToKick);
    }

    /**
     * Change le rôle d'un membre dans la guilde.
     * @param guildAdminId L'ID de l'admin de la guilde qui effectue le changement.
     * @param memberId L'ID du membre dont le rôle va changer.
     * @param newRole Le nouveau rôle ("member", "officer").
     */
    @Transactional
    public boolean changeGuildMemberRole(Long guildAdminId, Long memberId, GuildRole newRole) {
        
        User guildAdmin = userRepository.findById(guildAdminId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur guildAdmin introuvable"));
        
        User member = userRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Membre introuvable"));
        
        GuildMembership guildAdminMembership = guildMembershipRepository.findByUser(guildAdmin);
        
        Guild guild = guildAdminMembership.getGuild();
        
        // Vérifier si le membre est dans la même guilde
        GuildMembership memberMembership = guildMembershipRepository.findByUser(member);
        if (memberMembership == null || memberMembership.getGuild() == null || !memberMembership.getGuild().getId().equals(guild.getId())) {
            throw new IllegalStateException("Le membre n'est pas dans votre guilde.");
        }
        
        GuildRole guildAdminRole = guildAdminMembership.getRole();
        
        if (newRole.hasAtLeastRole(guildAdminRole)) {
            throw new IllegalStateException("Vous ne pouvez pas donner un rôle supérieur ou égal au vôtre.");
        }

        if (!guildAdminRole.hasAtLeastRole(GuildRole.VETERAN)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour changer le rôle d'un membre.");
        }

        // Mettre à jour le rôle
        memberMembership.setRole(newRole);
        guildMembershipRepository.save(memberMembership);

        return true;
    }

    /**
     * Modifie le leader de la guilde.
     * @param leaderId L'ID de l'utilisateur qui est l'actuel leader
     * @param newLeaderId L'ID de l'utilisateur qui devient le nouveau leader
     * @param guildId L'ID de la guilde
     * @return true si le changement a réussi, false sinon
     */
    @Transactional
    public boolean changeGuildLeader(Long leaderId, Long newLeaderId, Long guildId) {
        User currentLeader = userRepository.findById(leaderId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        User newLeader = userRepository.findById(newLeaderId)
                .orElseThrow(() -> new IllegalArgumentException("Nouveau leader introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership currentLeaderMembership = guildMembershipRepository.findByUser(currentLeader);
        if (currentLeaderMembership == null || !currentLeaderMembership.getGuild().getId().equals(guild.getId())) {
            throw new IllegalStateException("L'utilisateur actuel n'est pas dans la guilde.");
        }

        // Vérifier si le leader actuel a le rôle de leader
        if (currentLeaderMembership.getRole() != GuildRole.LEADER) {
            throw new IllegalStateException("L'utilisateur actuel n'est pas le leader de la guilde.");
        }
        
        // Vérifier si le nouvel utilisateur est membre de la guilde
        GuildMembership newLeaderMembership = guildMembershipRepository.findByUser(newLeader);

        if (newLeaderMembership == null || !newLeaderMembership.getGuild().getId().equals(guild.getId())) {
            throw new IllegalStateException("Le nouvel utilisateur n'est pas membre de la guilde.");
        }

        // Changer le rôle du nouvel utilisateur en LEADER
        newLeaderMembership.setRole(GuildRole.LEADER);
        
        // Changer le rôle de l'ancien leader en CONSEILLER
        currentLeaderMembership.setRole(GuildRole.CONSEILLER);

        // Enregistrer les modifications
        guildMembershipRepository.save(newLeaderMembership);
        guildMembershipRepository.save(currentLeaderMembership);
        
        return true;
    }

    /**
     * Récupère une guilde par son nom.
     * @param name Le nom de la guilde à rechercher.
     * @return La guilde correspondante, ou une valeur vide si aucune guilde ne correspond.
     */
    @Transactional(readOnly = true)
    public Optional<Guild> getGuildByName(String name) {
        return guildRepository.findByName(name);
    }

    /**
     * Récupère l'adhésion à une guilde de l'utilisateur.
     * @param user L'utilisateur dont on veut récupérer l'adhésion.
     * @return L'adhésion de l'utilisateur, ou null si l'utilisateur n'appartient à aucune guilde.
     */
    @Transactional(readOnly = true)
    public GuildMembership getUserMembership(User user) {
        return guildMembershipRepository.findByUser(user);
    }

    /**
     * Ajoute un utilisateur à une guilde par son ID.
     * @param userId L'ID de l'utilisateur à ajouter.
     * @param guildId L'ID de la guilde.
     */
    @Transactional
    public void addUserToGuild(Long userId, Long guildId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur à ajouter introuvable"));
        
        joinGuild(user, guildId);
    }

    /**
     * Récupère un DTO complet pour la guilde d'un utilisateur à partir de son ID.
     * @param userId L'ID de l'utilisateur dont on veut récupérer la guilde.
     * @return DTO avec les informations complètes de la guilde et le rôle de l'utilisateur.
     */
    @Transactional(readOnly = true)
    public Optional<GuildDTO> getUserGuildDTOById(Long userId, boolean isMember) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        return getUserGuildDTO(user, isMember);
    }

    /**
     * Modifie la description d'une guilde.
     * @param userId ID de l'utilisateur qui fait la modification
     * @param guildId ID de la guilde à modifier
     * @param newDescription Nouvelle description
     * @return La guilde modifiée
     */
    @Transactional
    public Guild updateGuildDescription(Long userId, Long guildId, String newDescription) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership membership = guildMembershipRepository.findByUserAndGuild(user, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        // Vérifier si l'utilisateur a les permissions (au moins VETERAN)
        if (!membership.getRole().hasAtLeastRole(GuildRole.VETERAN)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour modifier la description");
        }
        
        guild.setDescription(newDescription);
        return guildRepository.save(guild);
    }
    
    /**
     * Supprime une guilde (uniquement par le LEADER).
     * @param userId ID de l'utilisateur qui demande la suppression
     * @param guildId ID de la guilde à supprimer
     */
    @Transactional
    public void deleteGuild(Long userId, Long guildId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership membership = guildMembershipRepository.findByUserAndGuild(user, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        // Vérifier si l'utilisateur est le leader
        if (membership.getRole() != GuildRole.LEADER) {
            throw new IllegalStateException("Seul le leader de guilde peut supprimer la guilde");
        }
        
        // Supprimer tous les membres
        for (GuildMembership member : new ArrayList<>(guild.getMembers())) {
            User memberUser = member.getUser();
            memberUser.setGuildMembership(null);
            guild.removeMember(member);
            guildMembershipRepository.delete(member);
            userRepository.save(memberUser);
        }
        
        // Supprimer les bans
        List<GuildBan> bans = guildBanRepository.findByGuildId(guildId);

        for (GuildBan ban : bans) {
            ban.setGuild(null);
            guildBanRepository.delete(ban);
        }
        
        // Supprimer la guilde
        guildRepository.delete(guild);
    }
    
    /**
     * Bannit un utilisateur d'une guilde.
     * @param requesterId ID de l'utilisateur qui effectue le bannissement
     * @param targetUserId ID de l'utilisateur à bannir
     * @param guildId ID de la guilde
     * @param reason Raison du bannissement
     * @return L'entité DTO du bannissement
     */
    @Transactional
    public GuildBanDTO banUserFromGuild(Long requesterId, Long targetUserId, Long guildId, String reason) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur requérant introuvable"));
        
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur cible introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership requesterMembership = guildMembershipRepository.findByUserAndGuild(requester, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        GuildRole requesterRole = requesterMembership.getRole();
        // Vérifier si l'utilisateur a les permissions pour bannir un membre
        if (!requesterRole.hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour bannir un utilisateur");
        }
        
        // Vérifier si l'utilisateur cible est déjà banni
        if (guildBanRepository.findByGuildIdAndUserId(guildId, targetUserId).isPresent()) {
            throw new IllegalStateException("Cet utilisateur est déjà banni de la guilde");
        }
        
        // Si l'utilisateur cible est membre de la guilde, l'expulser d'abord

        GuildMembership targetMembership = guildMembershipRepository.findByUserAndGuild(targetUser, guild).orElse(null);
        
        if (targetMembership != null && targetMembership.getGuild().getId().equals(guildId)) {

             // Vérifier le rôle de la cible par rapport au requérant
            GuildRole targetRole = targetMembership.getRole();

            if (targetRole.hasAtLeastRole(requesterRole)) {
                throw new IllegalStateException("Vous ne pouvez pas bannir un membre de rang égal ou supérieur au vôtre");
            }
            
            
            // Expulser l'utilisateur
            guild.removeMember(targetMembership);
            targetUser.setGuildMembership(null);
            guildMembershipRepository.delete(targetMembership);
            userRepository.save(targetUser);
        }
        
        // Bannir l'utilisateur
        GuildBan ban = new GuildBan();
        ban.setUser(targetUser);
        ban.setGuild(guild);
        ban.setBannedBy(requester);
        ban.setBanDate(Instant.now());
        ban.setReason(reason);

        guildBanRepository.save(ban);

        return GuildBanDTO.fromEntity(ban);
    }
    
    /**
     * Récupère la liste des utilisateurs bannis d'une guilde.
     * @param userId ID de l'utilisateur qui fait la demande
     * @param guildId ID de la guilde
     * @return Liste des DTOs de bannissement
     */
    @Transactional(readOnly = true)
    public List<GuildBanDTO> getGuildBannedUsers(Long userId, Long guildId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership membership = guildMembershipRepository.findByUserAndGuild(user, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        // Vérifier si l'utilisateur a les permissions (au moins MEMBRE)
        if (!membership.getRole().hasAtLeastRole(GuildRole.MEMBRE)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour voir la liste des bannis");
        }
        
        List<GuildBan> bannedUsers = guildBanRepository.findByGuildId(guildId);
        return bannedUsers.stream()
                .map(GuildBanDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Débannit un utilisateur d'une guilde.
     * @param requesterId ID de l'utilisateur qui effectue le débannissement
     * @param targetUserId ID de l'utilisateur à débannir
     * @param guildId ID de la guilde
     */
    @Transactional
    public void unbanUserFromGuild(Long requesterId, Long targetUserId, Long guildId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur requérant introuvable"));

        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership requesterMembership = guildMembershipRepository.findByUserAndGuild(requester, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        // Vérifier si l'utilisateur requérant a les permissions (LEADER ou CONSEILLER)
        if (!requesterMembership.getRole().hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour débannir un utilisateur");
        }
        
        // Vérifier si l'utilisateur cible est banni
        Optional<GuildBan> ban = guildBanRepository.findByGuildIdAndUserId(guildId, targetUserId);
        if (ban.isEmpty()) {
            throw new IllegalStateException("Cet utilisateur n'est pas banni de la guilde");
        }
        
        // Débannir l'utilisateur
        guildBanRepository.delete(ban.get());
    }
    
    /**
     * Change le statut ouvert/fermé d'une guilde.
     * @param userId ID de l'utilisateur qui fait la demande
     * @param guildId ID de la guilde
     * @param isOpen Nouveau statut (true = ouvert, false = fermé)
     * @return La guilde mise à jour
     */
    @Transactional
    public Guild updateGuildOpenStatus(Long userId, Long guildId, boolean isOpen) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership membership = guildMembershipRepository.findByUserAndGuild(user, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        // Vérifier si l'utilisateur a les permissions (LEADER ou CONSEILLER)
        if (!membership.getRole().hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour modifier le statut de la guilde");
        }
        
        guild.setOpen(isOpen);
        return guildRepository.save(guild);
    }
    
    
    /**
     * Ajoute des points de contribution à un membre de la guilde.
     * @param userId ID de l'utilisateur
     * @param guildId ID de la guilde
     * @param points Nombre de points à ajouter
     * @return Le nombre total de points de contribution après l'ajout
     */
    @Transactional
    public int addContributionPoints(Long userId, Long guildId, int points) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        GuildMembership membership = guildMembershipRepository.findByUserAndGuild(user, guild)
                .orElseThrow(() -> new IllegalStateException("Vous n'êtes pas membre de cette guilde"));
        
        membership.addContribution(points);
        
        // Ajouter un peu d'XP à la guilde
        guild.addExperience(points / 10);
        
        guildMembershipRepository.save(membership);
        guildRepository.save(guild);
        
        return membership.getContributions();
    }

    /**
     * Récupère la liste de tous les membres d'une guilde spécifique.
     * @param guildId ID de la guilde
     * @param detailed Si true, inclut des informations détaillées comme les contributions
     * @return Liste des membres de la guilde
     */
    @Transactional(readOnly = true)
    public List<GuildMemberDTO> getAllGuildMembersByGuildId(Long guildId, boolean detailed) {
        List<GuildMembership> memberships = guildMembershipRepository.findByGuildId(guildId);
        
        if (detailed) {
            // Créer des DTOs détaillés avec les contributions
            return memberships.stream()
                    .map(m -> {
                        GuildMemberDTO dto = GuildMemberDTO.fromEntity(m);
                        dto.setContributions(m.getContributions());
                        dto.setLastActivity(m.getLastActivity());
                        return dto;
                    })
                    .collect(Collectors.toList());
        } else {
            // DTOs standards
            return memberships.stream()
                    .map(GuildMemberDTO::fromEntity)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Invite un utilisateur à rejoindre la guilde de l'utilisateur requérant.
     * @param requester L'utilisateur qui envoie l'invitation
     * @param targetUserId L'ID de l'utilisateur invité
     * @throws IllegalArgumentException Si l'utilisateur cible n'existe pas
     * @throws IllegalStateException Si le requérant n'est pas dans une guilde ou n'a pas les permissions nécessaires
     */
    @Transactional
    public void inviteUserToGuild(User requester, Long targetUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur cible introuvable"));
        
        // Vérifier si le requérant est membre d'une guilde
        GuildMembership requesterMembership = guildMembershipRepository.findByUser(requester);
        if (requesterMembership == null) {
            throw new IllegalStateException("Vous n'êtes pas membre d'une guilde");
        }
        
        Guild guild = requesterMembership.getGuild();
        
        // Vérifier si le requérant a les permissions nécessaires (au moins VETERAN)
        if (!requesterMembership.getRole().hasAtLeastRole(GuildRole.VETERAN)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour inviter un utilisateur");
        }
        
        // Vérifier si l'utilisateur cible est déjà membre d'une guilde
        if (targetUser.getGuildMembership() != null) {
            throw new IllegalStateException("L'utilisateur est déjà membre d'une guilde");
        }
        
        // Vérifier si l'utilisateur cible est banni de la guilde
        if (guildBanRepository.findByGuildIdAndUserId(guild.getId(), targetUserId).isPresent()) {
            throw new IllegalStateException("L'utilisateur est banni de cette guilde");
        }
        
        // Vérifier si l'utilisateur est déjà invité
        if (guild.isUserInvited(targetUserId)) {
            throw new IllegalStateException("Cet utilisateur a déjà été invité à rejoindre la guilde");
        }
        
        // Ajouter à la liste des invitations en attente
        guild.addPendingInvitation(targetUserId);
        guildRepository.save(guild);
        
        // Envoyer un message d'invitation à l'utilisateur cible
        String subject = "Invitation à rejoindre la guilde " + guild.getName();
        String message = "Bonjour " + targetUser.getUsername() + ",\n\n" + 
                requester.getUsername() + " vous invite à rejoindre la guilde \"" + guild.getName() + "\".\n\n" +
                "Description de la guilde :\n" + guild.getDescription() + "\n\n" +
                "Pour accepter cette invitation, veuillez vous rendre dans l'onglet Guilde de votre profil.";
        
        messageService.sendMessage(requester, targetUser, subject, message);
    }

    /**
     * Accepte une invitation à rejoindre une guilde.
     * @param user L'utilisateur qui accepte l'invitation
     * @param guildId L'ID de la guilde
     * @throws IllegalArgumentException Si la guilde n'existe pas
     * @throws IllegalStateException Si l'utilisateur est déjà dans une guilde
     */
    @Transactional
    public void acceptGuildInvite(User user, Long guildId) {
        // Vérifier si la guilde existe
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        // Vérifier si l'utilisateur est déjà dans une guilde
        if (user.getGuildMembership() != null) {
            throw new IllegalStateException("Vous êtes déjà membre d'une guilde");
        }
        
        // Vérifier si la guilde est pleine
        if (guild.getMembers().size() >= guild.getMaxMembers()) {
            throw new IllegalStateException("Cette guilde est pleine");
        }
        
        // Vérifier si l'utilisateur est banni de la guilde
        if (guildBanRepository.findByGuildIdAndUserId(guildId, user.getId()).isPresent()) {
            throw new IllegalStateException("Vous êtes banni de cette guilde");
        }

        // Vérifier si l'utilisateur a été invité
        if (!guild.isUserInvited(user.getId())) {
            throw new IllegalStateException("Vous n'avez pas été invité à rejoindre cette guilde");
        }
        
        // Supprimer l'invitation
        guild.removePendingInvitation(user.getId());
        
        // Créer l'adhésion de l'utilisateur à la guilde
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole(GuildRole.NOUVEAU);
        membership.setJoinDate(Instant.now());
        
        guild.addMember(membership);
        user.setGuildMembership(membership);
        guildMembershipRepository.save(membership);
        userRepository.save(user);
        guildRepository.save(guild);
    }

    /**
     * Refuse une invitation à rejoindre une guilde.
     * @param user L'utilisateur qui refuse l'invitation
     * @param guildId L'ID de la guilde
     * @throws IllegalArgumentException Si la guilde n'existe pas
     */
    @Transactional
    public void declineGuildInvite(User user, Long guildId) {
        // Vérifier que la guilde existe
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        // Vérifier si l'utilisateur a été invité
        if (!guild.isUserInvited(user.getId())) {
            throw new IllegalStateException("Vous n'avez pas été invité à rejoindre cette guilde");
        }
        
        // Supprimer l'invitation
        guild.removePendingInvitation(user.getId());
        guildRepository.save(guild);
    }

    /**
     * Envoie une demande d'adhésion à une guilde.
     * @param user L'utilisateur qui envoie la demande
     * @param guildId L'ID de la guilde
     * @throws IllegalArgumentException Si la guilde n'existe pas
     * @throws IllegalStateException Si l'utilisateur est déjà dans une guilde
     */
    @Transactional
    public void requestToJoinGuild(User user, Long guildId) {
        // Vérifier si la guilde existe
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        
        // Vérifier si l'utilisateur est déjà dans une guilde
        if (user.getGuildMembership() != null) {
            throw new IllegalStateException("Vous êtes déjà membre d'une guilde");
        }
        
        // Vérifier si la guilde est pleine
        if (guild.getMembers().size() >= guild.getMaxMembers()) {
            throw new IllegalStateException("Cette guilde est pleine");
        }
        
        // Vérifier si l'utilisateur est banni de la guilde
        if (guildBanRepository.findByGuildIdAndUserId(guildId, user.getId()).isPresent()) {
            throw new IllegalStateException("Vous êtes banni de cette guilde");
        }
        
        // Vérifier si la guilde accepte les demandes d'adhésion
        if (!guild.isOpen()) {
            throw new IllegalStateException("Cette guilde n'accepte pas les demandes d'adhésion");
        }
        
        // Vérifier si l'utilisateur a déjà envoyé une demande
        if (guild.hasUserRequestedToJoin(user.getId())) {
            throw new IllegalStateException("Vous avez déjà envoyé une demande d'adhésion à cette guilde");
        }
        
        // Ajouter à la liste des demandes en attente
        guild.addPendingAdhesion(user.getId());
        guildRepository.save(guild);
        
        // Envoyer un message au leader de la guilde
        GuildMembership leaderMembership = guild.getMembers().stream()
                .filter(m -> m.getRole() == GuildRole.LEADER)
                .findFirst()
                .orElse(null);
        
        if (leaderMembership != null) {
            String subject = "Nouvelle demande d'adhésion à votre guilde";
            String message = user.getUsername() + " a demandé à rejoindre votre guilde \"" + guild.getName() + "\".";
            messageService.sendMessage(user, leaderMembership.getUser(), subject, message);
        }
    }

    /**
     * Accepte une demande d'adhésion à une guilde.
     * @param guildAdmin L'utilisateur qui accepte la demande
     * @param userId L'ID de l'utilisateur ayant fait la demande
     * @throws IllegalArgumentException Si l'utilisateur n'existe pas
     * @throws IllegalStateException Si le requérant n'est pas dans une guilde ou n'a pas les permissions nécessaires
     */
    @Transactional
    public void acceptGuildRequest(User guildAdmin, Long userId) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        // Vérifier si le guildAdmin est membre d'une guilde
        GuildMembership guildAdminMembership = guildMembershipRepository.findByUser(guildAdmin);
        if (guildAdminMembership == null) {
            throw new IllegalStateException("Vous n'êtes pas membre d'une guilde");
        }
        
        Guild guild = guildAdminMembership.getGuild();
        
        // Vérifier si le guildAdmin a les permissions nécessaires (au moins CONSEILLER)
        if (!guildAdminMembership.getRole().hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour accepter une demande d'adhésion");
        }
        
        // Vérifier si l'utilisateur cible est déjà membre d'une guilde
        if (targetUser.getGuildMembership() != null) {
            throw new IllegalStateException("L'utilisateur est déjà membre d'une guilde");
        }
        
        // Vérifier si la guilde est pleine
        if (guild.getMembers().size() >= guild.getMaxMembers()) {
            throw new IllegalStateException("Votre guilde est pleine");
        }
        
        // Vérifier si l'utilisateur est banni de la guilde
        if (guildBanRepository.findByGuildIdAndUserId(guild.getId(), userId).isPresent()) {
            throw new IllegalStateException("Cet utilisateur est banni de votre guilde");
        }
        
        // Vérifier si l'utilisateur a bien fait une demande d'adhésion
        if (!guild.hasUserRequestedToJoin(userId)) {
            throw new IllegalStateException("Cet utilisateur n'a pas demandé à rejoindre votre guilde");
        }
        
        // Supprimer la demande d'adhésion
        guild.removePendingAdhesion(userId);
        
        // Créer l'adhésion à la guilde pour l'utilisateur cible
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(targetUser);
        membership.setRole(GuildRole.NOUVEAU);
        membership.setJoinDate(Instant.now());
        
        guild.addMember(membership);
        targetUser.setGuildMembership(membership);
        guildMembershipRepository.save(membership);
        userRepository.save(targetUser);
        guildRepository.save(guild);
        
        // Envoyer un message à l'utilisateur pour l'informer que sa demande a été acceptée
        String subject = "Votre demande d'adhésion à " + guild.getName() + " a été acceptée";
        String message = "Bonjour " + targetUser.getUsername() + ",\n\n" +
                "Votre demande d'adhésion à la guilde \"" + guild.getName() + "\" a été acceptée par " + 
                guildAdmin.getUsername() + ".\n\n" +
                "Vous faites maintenant partie de cette guilde. Bienvenue !";
        
        messageService.sendMessage(guildAdmin, targetUser, subject, message);
    }

    /**
     * Refuse une demande d'adhésion à une guilde.
     * @param guildAdmin L'utilisateur qui refuse la demande
     * @param userId L'ID de l'utilisateur ayant fait la demande
     * @throws IllegalArgumentException Si l'utilisateur n'existe pas
     * @throws IllegalStateException Si le requérant n'est pas dans une guilde ou n'a pas les permissions nécessaires
     */
    @Transactional
    public void declineGuildRequest(User guildAdmin, Long userId) {
        // On vérifie que l'utilisateur existe
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        
        // Vérifier si le guildAdmin est membre d'une guilde
        GuildMembership guildAdminMembership = guildMembershipRepository.findByUser(guildAdmin);
        if (guildAdminMembership == null) {
            throw new IllegalStateException("Vous n'êtes pas membre d'une guilde");
        }
        
        Guild guild = guildAdminMembership.getGuild();
        
        // Vérifier si le guildAdmin a les permissions nécessaires (au moins CONSEILLER)
        if (!guildAdminMembership.getRole().hasAtLeastRole(GuildRole.CONSEILLER)) {
            throw new IllegalStateException("Vous n'avez pas les permissions nécessaires pour refuser une demande d'adhésion");
        }
        
        // Vérifier si l'utilisateur a bien fait une demande d'adhésion
        if (!guild.hasUserRequestedToJoin(userId)) {
            throw new IllegalStateException("Cet utilisateur n'a pas demandé à rejoindre votre guilde");
        }
        
        // Supprimer la demande d'adhésion
        guild.removePendingAdhesion(userId);
        guildRepository.save(guild);
    }

    /**
     * Récupère les guildes les plus récemment créées.
     * @param limit Le nombre maximum de guildes à récupérer
     * @return Liste des DTOs d'informations de base sur les guildes
     */
    @Transactional(readOnly = true)
    public List<GuildInfoDTO> getRecentGuilds(int limit) {
        List<Guild> guilds = guildRepository.findAllByOrderByCreationDateDesc(limit);
        return guilds.stream()
                .map(GuildInfoDTO::fromEntity)
                .collect(Collectors.toList());
    }
}
