package com.epic7.backend.repository;

import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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

}
