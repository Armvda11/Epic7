package com.epic7.backend.repository;

import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.enums.EquipmentType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Interface de gestion des équipements dans la base de données.
 */
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    List<Equipment> findByType(EquipmentType type); // filter by equipment type for the playerHero slot
}
