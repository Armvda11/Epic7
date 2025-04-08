package com.epic7.backend.repository;

import com.epic7.backend.model.Hero;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/**
 * Interface de gestion des héros dans la base de données.
 * 
 * Cette interface étend JpaRepository pour fournir des méthodes de gestion des héros.
 * 
 * @author hermas
 */
public interface HeroRepository extends JpaRepository<Hero, Long> {
    Optional<Hero> findByName(String name);
    Optional<Hero> findByCode(String code);
    
    Optional<Hero> findById(Long id);
    @Query(value = "SELECT * FROM hero ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<Hero> findRandomHero();


    boolean existsByName(String name);
    boolean existsByCode(String code);
}
