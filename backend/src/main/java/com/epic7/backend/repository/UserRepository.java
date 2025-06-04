package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.epic7.backend.repository.model.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    
    // Méthode de recherche par nom d'utilisateur (insensible à la casse)
    List<User> findByUsernameLikeIgnoreCase(String pattern);
    
    // Méthodes pour le système de classement RTA
    @Query(value = "SELECT * FROM User u ORDER BY u.rta_points DESC LIMIT :limit", nativeQuery = true)
    List<User> findTopRtaPlayers(@Param("limit") int limit);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.rtaPoints > :points")
    int countUsersWithHigherRtaPoints(@Param("points") int points);

}
