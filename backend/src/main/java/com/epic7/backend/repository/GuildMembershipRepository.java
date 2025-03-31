package com.epic7.backend.repository;

import com.epic7.backend.model.GuildMembership;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Interface de gestion des adhésions aux guildes dans la base de données.

 */
public interface GuildMembershipRepository extends JpaRepository<GuildMembership, Long> {
    GuildMembership findByUser(User user); // get the guild of a user
    Optional<GuildMembership> findByUserIdAndGuildId(Long userId, Long guildId);
    List<GuildMembership> findByGuildId(Long guildId); // get all members of a guild
}
