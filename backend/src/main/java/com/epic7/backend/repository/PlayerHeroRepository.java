package com.epic7.backend.repository;

import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerHeroRepository extends JpaRepository<PlayerHero, Long> {
    List<PlayerHero> findByUser(User user);
    List<PlayerHero> findByUserId(Long userId);
    Optional<PlayerHero> findByIdAndUserId(Long id, Long userId); // vérifier que le héro appartient bien à l'utilisateur
}
