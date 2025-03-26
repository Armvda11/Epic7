package com.epic7.backend.repository;

import com.epic7.backend.model.PlayerEquipment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerEquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
}
