package com.epic7.backend.repository;

import com.epic7.backend.model.Guild;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Interface de gestion des guildes dans la base de données.
 */
public interface GuildRepository extends JpaRepository<Guild, Long> {
    Optional<Guild> findByName(String name); // find a guild by its name
    boolean existsByName(String name);
}
