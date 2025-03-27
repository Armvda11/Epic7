package com.epic7.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.epic7.backend.model.ShopItem;
import com.epic7.backend.model.ShopPurchase;
import com.epic7.backend.model.User;

public interface ShopPurchaseRepository extends JpaRepository<ShopPurchase, Long> {
    int countByUserAndShopItem(User user, ShopItem item);
}