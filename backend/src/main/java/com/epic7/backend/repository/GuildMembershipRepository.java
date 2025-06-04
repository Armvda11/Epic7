package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.epic7.backend.repository.model.Guild;
import com.epic7.backend.repository.model.GuildMembership;
import com.epic7.backend.repository.model.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildMembershipRepository extends JpaRepository<GuildMembership, Long> {
    GuildMembership findByUser(User user); // get the guild of a user
    Optional<GuildMembership> findByUserIdAndGuildId(Long userId, Long guildId);
    List<GuildMembership> findByGuildId(Long guildId); // get all members of a guild
    Optional<GuildMembership> findByUserAndGuild(User user, Guild guild);
}
