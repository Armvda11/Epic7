package com.epic7.backend.repository;

import com.epic7.backend.model.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface BannerRepository extends JpaRepository<Banner, Long> {
    Optional<Banner> findFirstByStartsAtBeforeAndEndsAtAfterOrderByStartsAtDesc(LocalDateTime now1, LocalDateTime now2);
}
