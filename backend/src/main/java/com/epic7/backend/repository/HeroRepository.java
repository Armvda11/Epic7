package com.epic7.backend.repository;

import com.epic7.backend.model.Hero;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HeroRepository extends JpaRepository<Hero, Long> {
    Optional<Hero> findByName(String name);
}
