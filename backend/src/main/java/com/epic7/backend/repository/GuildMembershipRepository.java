package com.epic7.backend.repository;

import com.epic7.backend.model.GuildMembership;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GuildMembershipRepository extends JpaRepository<GuildMembership, Long> {
    List<GuildMembership> findByUser(User user);
    Optional<GuildMembership> findByUserIdAndGuildId(Long userId, Long guildId);
}
