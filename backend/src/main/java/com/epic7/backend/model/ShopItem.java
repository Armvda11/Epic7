package com.epic7.backend.model;

import java.time.Instant;

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

/**
 * Représente un objet dans la boutique du jeu.
 * Chaque objet a un nom, une description, un type (HERO, EQUIPMENT, GOLD, DIAMOND),
 * un prix en diamants et en or, une date de début et de fin de disponibilité,
 * un nombre maximum d'achats par utilisateur et un ID cible (pour les héros, équipements, etc.).
 * @author hermas
 */
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

    private String name; // Nom de l'objet (ex. "Héros 5 étoiles", "Équipement légendaire", etc.)

    private String description; // Description de l'objet (ex. "Héros 5 étoiles avec des compétences spéciales", etc.)

    @Enumerated(EnumType.STRING)
    private ShopItemType type; // HERO, EQUIPMENT, GOLD, DIAMOND

    private int priceInDiamonds; // Prix en diamants de l'objet (ex. 1000, 2000, etc.)

    private int priceInGold;

    private boolean limitedTime; // Indique si l'objet est en vente limitée dans le temps

    private Instant startAt; // Date de début de disponibilité de l'objet

    private Instant endAt; // Date de fin de disponibilité de l'objet

    private Integer maxPurchasePerUser; // Nombre maximum d'achats par utilisateur

    private Long targetItemId; // ID du héros, équipement ou autre

    @CreationTimestamp
    private Instant createdAt; // Date de création de l'objet
}
