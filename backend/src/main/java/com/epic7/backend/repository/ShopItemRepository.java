
package com.epic7.backend.repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.epic7.backend.repository.model.ShopItem;

public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
    //List<ShopItem> findByStartAtBeforeAndEndAtAfter(LocalDateTime now1, LocalDateTime now2);

   // List<ShopItem> findByStartAtBeforeAndEndAtAfter();
}


