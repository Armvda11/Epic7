package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.epic7.backend.model.GuildBan;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildBanRepository extends JpaRepository<GuildBan, Long> {
    List<GuildBan> findByGuildId(Long guildId);
    Optional<GuildBan> findByGuildIdAndUserId(Long guildId, Long userId);
    void deleteByGuildIdAndUserId(Long guildId, Long userId);
}
