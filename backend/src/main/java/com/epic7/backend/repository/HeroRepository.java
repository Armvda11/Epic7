package com.epic7.backend.repository;

import com.epic7.backend.model.Hero;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
