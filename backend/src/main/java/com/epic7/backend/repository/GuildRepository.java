package com.epic7.backend.repository;

import com.epic7.backend.model.Guild;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuildRepository extends JpaRepository<Guild, Long> {
    Optional<Guild> findByName(String name);
    boolean existsByName(String name);
}
