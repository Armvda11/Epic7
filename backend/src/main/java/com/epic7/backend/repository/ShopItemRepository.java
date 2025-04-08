
package com.epic7.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.hibernate.cache.spi.support.AbstractReadWriteAccess.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.epic7.backend.model.ShopItem;

public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
    //List<ShopItem> findByStartAtBeforeAndEndAtAfter(LocalDateTime now1, LocalDateTime now2);

   // List<ShopItem> findByStartAtBeforeAndEndAtAfter();

}


