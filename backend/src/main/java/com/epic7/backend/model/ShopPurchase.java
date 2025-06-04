package com.epic7.backend.model;



import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


/**
 * Représente un achat effectué par un utilisateur dans la boutique du jeu.
 * Contient des informations sur l'utilisateur, l'objet acheté, la quantité achetée
 * et la date d'achat.
 * @author hermas
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private User user; // L'utilisateur qui a effectué l'achat

    @ManyToOne(optional = false)
    private ShopItem shopItem; // L'objet acheté dans la boutique

    private int quantity; // Quantité achetée de l'objet

    private int totalPrice; // Prix total de l'achat (en diamants ou en or)

    private int totalGoldPrice; // Prix total de l'achat (en or)

    private int totalDiamondsPrice; // Prix total de l'achat (en diamants)

    @CreationTimestamp
    private Instant purchasedAt; // Date de l'achat
    // Constructeur, getters et setters générés par Lombok
}
