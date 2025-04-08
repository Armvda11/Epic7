package com.epic7.backend.repository;

import com.epic7.backend.model.Guild;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Interface de gestion des guildes dans la base de données.
 */
@Repository
public interface GuildRepository extends JpaRepository<Guild, Long> {
    Optional<Guild> findByName(String name); // find a guild by its name

    /**
     * Recherche des guildes par nom (recherche partielle insensible à la casse)
     */
    @Query("SELECT g FROM Guild g WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Guild> searchByNameContaining(@Param("query") String query);

    @Query(value = "SELECT g FROM Guild g ORDER BY g.creationDate DESC")
    List<Guild> findAllByOrderByCreationDateDesc(int limit);
}
