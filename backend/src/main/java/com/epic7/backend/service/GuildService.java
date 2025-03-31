package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Service de gestion des guildes.
 * Ce service gère la création, l'adhésion et la sortie des guildes pour les utilisateurs.
 * Il permet également de récupérer les membres d'une guilde et de vérifier l'appartenance d'un utilisateur à une guilde.
 * @author hermas
 */
@Service
public class GuildService {

    private final GuildRepository guildRepository;
    private final GuildMembershipRepository guildMembershipRepository;

    public GuildService(GuildRepository guildRepository, GuildMembershipRepository guildMembershipRepository) {
        this.guildRepository = guildRepository;
        this.guildMembershipRepository = guildMembershipRepository;
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
        guild = guildRepository.save(guild);

        // Créer l'adhésion de l'utilisateur à la guilde
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole("leader");
        membership.setJoinDate(Instant.now());

        // Enregistrer l'adhésion
        guildMembershipRepository.save(membership);
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

        // Générer l'adhésion de l'utilisateur à la guilde
        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole("member");
        membership.setJoinDate(Instant.now());

        guild.addMember(membership); // Ajout à la liste des membres de la guilde
        user.setGuildMembership(membership); //  de l'utilisateur

         // Pas besoin d'appeler guildMembershipRepository.save(membership)
        // Hibernate synchronisera automatiquement les modifications
        // Enregistrer l'adhésion
        // guildMembershipRepository.save(membership);
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
        if (memberships.getRole().equals("leader")) {
            throw new IllegalStateException("Le leader de la guilde ne peut pas quitter la guilde sans la dissoudre.");
        }

        GuildMembership currentMembership =  user.getGuildMembership();

        currentMembership.getGuild().removeMember(currentMembership); // Retirer l'utilisateur de la guilde
        user.setGuildMembership(null); // Supprimer l'adhésion de l'utilisateur

        // Supprimer l'adhésion de l'utilisateur à la guilde
        // (on suppose qu'un utilisateur ne peut appartenir qu'à une seule guilde)
        // guildMembershipRepository.delete(memberships.get(0));
    }

    /**
     * Récupère la guilde à laquelle appartient l'utilisateur.
     * @param user L'utilisateur dont on veut récupérer la guilde.
     * @return La guilde de l'utilisateur, ou une valeur vide si l'utilisateur n'appartient à aucune guilde.
     */
    @Transactional(readOnly = true)
    public Optional<Guild> getGuildOfUser(User user) {

        // Vérifier si l'utilisateur appartient à une guilde
        Guild guild = user.getGuildMembership().getGuild();

        if (guild == null) {
            // Si l'utilisateur n'appartient à aucune guilde, retourner une valeur vide
            return Optional.empty();
        } else {
            // Sinon, retourner la guilde
            return Optional.of(guild);
        }
        // Alternative avec le repository
        // return guildMembershipRepository.findByUser(user)
        //         .stream()
        //         .map(GuildMembership::getGuild)
        //         .findFirst();
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
}
