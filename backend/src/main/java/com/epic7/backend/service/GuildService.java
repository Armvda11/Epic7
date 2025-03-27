package com.epic7.backend.service;

import com.epic7.backend.model.*;
import com.epic7.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class GuildService {

    private final GuildRepository guildRepository;
    private final GuildMembershipRepository guildMembershipRepository;

    public GuildService(GuildRepository guildRepository, GuildMembershipRepository guildMembershipRepository) {
        this.guildRepository = guildRepository;
        this.guildMembershipRepository = guildMembershipRepository;
    }

    @Transactional
    public Guild createGuild(User user, String name, String description) {
        if (getGuildOfUser(user).isPresent()) {
            throw new IllegalStateException("L'utilisateur appartient déjà à une guilde.");
        }

        if (guildRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Ce nom de guilde est déjà utilisé.");
        }

        Guild guild = new Guild();
        guild.setName(name);
        guild.setDescription(description);
        guild = guildRepository.save(guild);

        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole("leader");
        membership.setJoinDate(Instant.now());

        guildMembershipRepository.save(membership);
        return guild;
    }

    @Transactional
    public void joinGuild(User user, Long guildId) {
        if (getGuildOfUser(user).isPresent()) {
            throw new IllegalStateException("L'utilisateur est déjà dans une guilde.");
        }

        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));

        GuildMembership membership = new GuildMembership();
        membership.setGuild(guild);
        membership.setUser(user);
        membership.setRole("member");
        membership.setJoinDate(Instant.now());

        guildMembershipRepository.save(membership);
    }

    @Transactional
    public void leaveGuild(User user) {
        List<GuildMembership> memberships = guildMembershipRepository.findByUser(user);
        if (memberships.isEmpty()) {
            throw new IllegalStateException("L'utilisateur n'appartient à aucune guilde.");
        }

        guildMembershipRepository.delete(memberships.get(0));
    }

    public Optional<Guild> getGuildOfUser(User user) {
        return guildMembershipRepository.findByUser(user)
                .stream()
                .map(GuildMembership::getGuild)
                .findFirst();
    }

    public List<GuildMembership> getMembers(Long guildId) {
        Guild guild = guildRepository.findById(guildId)
                .orElseThrow(() -> new IllegalArgumentException("Guilde introuvable"));
        return guild.getMembers();
    }

    public boolean isMemberOfGuild(User user, Long guildId) {
        return guildMembershipRepository.findByUserIdAndGuildId(user.getId(), guildId).isPresent();
    }
}
