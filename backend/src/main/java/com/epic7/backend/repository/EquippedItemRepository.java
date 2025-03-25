package com.epic7.backend.repository;

import com.epic7.backend.model.EquippedItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquippedItemRepository extends JpaRepository<EquippedItem, Long> {
}
