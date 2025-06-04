package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.epic7.backend.model.Hero;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;

import java.util.List;
import java.util.Optional;

public interface PlayerHeroRepository extends JpaRepository<PlayerHero, Long> {
    List<PlayerHero> findByUser(User user);
    List<PlayerHero> findByUserId(Long userId);
    Optional<PlayerHero> findByIdAndUserId(Long id, Long userId); // vérifier que le héro appartient bien à l'utilisateur
    boolean existsByUserAndHero(User user, Hero hero);

    @Query("""
        SELECT ph 
        FROM PlayerHero ph 
        JOIN ph.hero h 
        JOIN ShopItem si ON si.name = h.name 
        WHERE si.id = :itemId AND ph.user.id = :userId
        """)
    Optional<PlayerHero> findPlayerHeroWithItemById(@Param("itemId") Long itemId, @Param("userId") Long userId);
}
