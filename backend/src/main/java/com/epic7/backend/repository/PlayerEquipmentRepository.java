package com.epic7.backend.repository;

import com.epic7.backend.model.PlayerEquipment;
import com.epic7.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerEquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
    List<PlayerEquipment> findByUser(User user);
    List<PlayerEquipment> findByUserId(Long userId);
    List<PlayerEquipment> findByPlayerHeroId(Long id);




    Optional<PlayerEquipment> findByEquipmentId(Long equipmentId);
}
