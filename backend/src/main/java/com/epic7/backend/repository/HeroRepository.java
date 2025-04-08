package com.epic7.backend.repository;

import com.epic7.backend.model.Hero;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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


    boolean existsByName(String name);
    boolean existsByCode(String code);

    @Query("SELECT h FROM Hero h JOIN ShopItem i ON i.id = h.id WHERE i.id = :id")
    Optional<Hero> findHeroWithItemById(@Param("id") Long id);
}
