package com.epic7.backend.repository;

import com.epic7.backend.model.Banner;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Interface de gestion des bannières dans la base de données.

 */
public interface BannerRepository extends JpaRepository<Banner, Long> {
    // Rechercher une bannière active dans la base de données
    // en fonction de la date actuelle
    Optional<Banner> findActiveBannerByDateRange(LocalDateTime now1, LocalDateTime now2); 
}
