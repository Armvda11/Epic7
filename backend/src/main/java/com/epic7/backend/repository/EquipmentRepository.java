package com.epic7.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.epic7.backend.repository.model.Equipment;
import com.epic7.backend.repository.model.enums.EquipmentType;

/**
 * Interface de gestion des équipements dans la base de données.
 */
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    List<Equipment> findByType(EquipmentType type); // filter by equipment type for the playerHero slot

    @Query("SELECT e FROM Equipment e JOIN ShopItem i ON i.name = e.name WHERE i.id = :id")
    Optional<Equipment> findEquipmentWithItemById(@Param("id") Long id);
}