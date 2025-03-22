package com.epic7.backend.repository;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerHeroRepository extends JpaRepository<PlayerHero, Long> {
    List<PlayerHero> findByUser(User user);
}
