package com.epic7.backend.repository;

import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.PlayerHero;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlayerEquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
    List<PlayerEquipment> findByUser(User user);
    List<PlayerEquipment> findByUserId(Long userId);
    List<PlayerEquipment> findByPlayerHeroId(Long id);
    
    boolean existsByPlayerHeroAndEquipment(PlayerHero playerHero, com.epic7.backend.model.Equipment equipment);
    




    Optional<PlayerEquipment> findByEquipmentId(Long equipmentId);

    @Query("""
        SELECT pe 
        FROM PlayerEquipment pe 
        JOIN pe.equipment e 
        JOIN ShopItem si ON si.name = e.name 
        WHERE si.id = :id
    """)
    Optional<PlayerEquipment> findPlayerEquipmentWithItemById(@Param("id") Long id);

    
}
