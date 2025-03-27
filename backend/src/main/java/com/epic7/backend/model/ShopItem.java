package com.epic7.backend.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.epic7.backend.model.enums.ShopItemType;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    private ShopItemType type; // HERO, EQUIPMENT, GOLD, DIAMOND

    private int priceInDiamonds;

    private int priceInGold;

    private boolean limitedTime;

    private LocalDateTime startAt;

    private LocalDateTime endAt;

    private Integer maxPurchasePerUser;

    private Long targetId; // ID du héros, équipement ou autre

    @CreationTimestamp
    private LocalDateTime createdAt;
}
