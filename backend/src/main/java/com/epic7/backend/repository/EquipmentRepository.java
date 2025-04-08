package com.epic7.backend.repository;

import com.epic7.backend.model.Equipment;
import com.epic7.backend.model.Hero;
import com.epic7.backend.model.enums.EquipmentType;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Interface de gestion des équipements dans la base de données.
 */
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    List<Equipment> findByType(EquipmentType type); // filter by equipment type for the playerHero slot

    @Query("SELECT e FROM Equipment e JOIN ShopItem i ON i.id = e.id WHERE i.id = :id")
    Optional<Equipment> findEquipmentWithItemById(@Param("id") Long id);
}
